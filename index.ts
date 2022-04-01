import * as fs from "fs";
import { createMarkdownObjectTable, Stream } from 'parse-markdown-table'
import { Test } from '@japa/runner'

type Auth = { username: string, password: string }

export interface TranslatedRow {
    [key: string]: any,
    __rowProps: {
        entity: any,
        fromTable: any,
        auth: Auth
    }
}

type DictionaryProps = { [key: string]: { field: string, domain: any } }
type Dictionary = () => Promise<DictionaryProps>

export interface TableProps {
    tableFullPath: string
    dictionary: Dictionary
    authTableColumns?: Auth
}

export interface TableDrivenTestsConfig {
    usernameColumn: string
    passwordColumn: string
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

async function getTableValues(tableFullPath: string) {
    let untranslatedRows: any[] = [];
    try {
        const file: Stream = await fs.promises.readFile(tableFullPath.replace('.fixture.ts', '.md'), 'utf-8')
        const data = await createMarkdownObjectTable(file)
        for await (const row of data) {
            untranslatedRows.push(row)
        }
        return untranslatedRows;
    } catch (error) {
        console.log("Error when reading data from table ->", error)
    }
}

async function createDictionary(dictionary: Dictionary) {
    try {
        return await dictionary();
    } catch (error) {
        console.log("Error when creating dictionary: ", error)
    }
}

export async function translateTestData({ tableFullPath, authTableColumns, dictionary }: Required<TableProps>): Promise<TranslatedRow[]> {
    const translation = await createDictionary(dictionary);
    const untranslatedRows = await getTableValues(tableFullPath)
    if (!translation || !untranslatedRows) return [];
    return untranslatedRows.map(row => translate(row, translation, authTableColumns))
}


export default function tableDrivenTests({ usernameColumn, passwordColumn }: TableDrivenTestsConfig) {
    return async function (_: any, __: any, { Test }: { Test: any }) {
        Test.macro('withTableData', function (this: Test<TranslatedRow[]>, { dictionary, tableFullPath, authTableColumns }: TableProps) {
            return this.with(async () => await translateTestData({
                tableFullPath: tableFullPath || __filename,
                authTableColumns: authTableColumns || { username: usernameColumn, password: passwordColumn },
                dictionary
            })
            );
        })
    }
}


