import * as fs from "fs";
import { createMarkdownObjectTable, Stream } from 'parse-markdown-table'
import { Test } from '@japa/runner'
import getCallerFile from 'get-caller-file'

type Auth = { username: string, password: string }

export interface TranslatedRow {
    [key: string]: any,
    __rowProps: {
        entity: any,
        fromTable?: any,
        auth: Auth
    }
}

type DictionaryProps = { [key: string]: { field: string, domain: any } }
type Dictionary = (rows?: any) => Promise<DictionaryProps>

export interface TableProps {
    tablePath?: string
    extension?: string
    dictionary?: Dictionary
    authColumns?: Auth
}

export interface TableDrivenTestsConfig {
    usernameHeader?: string
    passwordHeader?: string
    extension?: string
}

function translate(row: any, dictionary: DictionaryProps, authFromTable: Auth) {
    let translatedRow: TranslatedRow = {
        __rowProps: {
            entity: {},
            fromTable: {},
            auth: { username: '', password: '' }
        }
    }
    const props = translatedRow.__rowProps;

    Object.entries(row).forEach(([rowHeader, rowValue]) => {
        translatedRow[rowHeader] = rowValue;
        props.fromTable[rowHeader] = rowValue
        Object.entries(dictionary).forEach(([key, { field, domain }]) => {
            if (rowHeader === key) {
                translatedRow[key] = domain[row[key]];
                if (field) props.entity[field] = domain[row[key]];
                props.fromTable[key] = row[key]
            }
            if (key === authFromTable.username) props.auth.username = domain[row[key]]
            if (key === authFromTable.password) props.auth.password = domain[row[key]]
        })
    })
    return translatedRow
}

async function getTableValues(tablePath: string, extension: string) {
    let untranslatedRows: any[] = [];
    try {
        const file: Stream = await fs.promises.readFile(tablePath.replace(extension, '.md'), 'utf-8')
        const data = await createMarkdownObjectTable(file)
        for await (const row of data) {
            untranslatedRows.push(row)
        }
        return untranslatedRows;
    } catch (error) {
        console.log("Error when reading data from table ->", error)
    }
}

async function dictionaryNotProvided(rows: any): Promise<DictionaryProps> {
    return Object.keys(rows[0]).map(k => k).reduce((acc, key) => {
        let fields: any = [...new Set(rows.map((row: any) => row[key]))];
        return {
            ...acc,
            ...fields.reduce((obj: any, field: string) => {
                if (obj[key]) {
                    return { [key]: { field: '', domain: { ...obj[key].domain, [field]: [field] } } }
                } else {
                    return { [key]: { field: '', domain: { [field]: [field] } } }
                }
            }, {})
        }
    }, {})
}

async function createDictionary(dictionary: Dictionary, rows: any) {
    try {
        return await dictionary(rows);
    } catch (error) {
        console.log("Error when creating dictionary: ", error)
    }
}

async function translateTestData({ tablePath, authColumns, dictionary, extension }: Required<TableProps>): Promise<TranslatedRow[]> {
    const untranslatedRows = await getTableValues(tablePath, extension)
    const translation = await createDictionary(dictionary, untranslatedRows);
    if (!translation || !untranslatedRows) return [];
    return untranslatedRows.map(row => translate(row, translation, authColumns))
}

export default function tableDrivenTests({ usernameHeader, passwordHeader, extension }: TableDrivenTestsConfig) {
    return async function (_: any, __: any, { Test }: { Test: any }) {
        Test.macro('withTableData', function (this: Test<TranslatedRow[]>, {
            dictionary = dictionaryNotProvided,
            tablePath = getCallerFile(),
            authColumns = { username: usernameHeader || 'Username', password: passwordHeader || 'Password' }
        }: Omit<TableProps, 'extension'> = {}) {
            return this.with(async () =>
                await translateTestData({ tablePath, extension: extension || '.spec.ts', authColumns, dictionary }));
        })
    }
}


