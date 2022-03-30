import * as fs from "fs";
import { createMarkdownObjectTable, Stream } from 'parse-markdown-table'

interface TranslatedRow {
    [key: string]: any,
    __rowProps: {
        entity: any,
        fromTable: any,
        auth: { username: string, password: string }
    }
}

export const translateTestData = async (
    filename: string,
    authFromTable: { username: string, password: string },
    createDictionary: () => Promise<{ [key: string]: { field: string, domain: any } }>
): Promise<TranslatedRow[]> => {
    let translatedRows: TranslatedRow[] = [];
    try {
        const dictionary = await createDictionary();
        const file: Stream = await fs.promises.readFile(filename.replace('.fixture.ts', '.md'), 'utf-8')
        const data = await createMarkdownObjectTable(file)
        for await (const row of data) {
            translatedRows.push(translate(row, dictionary, authFromTable))
        }
    } catch (error) {
        console.log("Erro ao criar massa de testes", error)
    }
    return translatedRows
}

function translate(row: any, dictionary: object, authFromTable: any) {
    let translatedRow: TranslatedRow = {
        __rowProps: {
            entity: {},
            fromTable: {},
            auth: { username: '', password: '' }
        }
    }

    Object.entries(row).forEach(([rowHeader, rowValue]) => {
        translatedRow[rowHeader] = rowValue;
        translatedRow.__rowProps.fromTable[rowHeader] = rowValue
        Object.entries(dictionary).forEach(([key, { field, domain }]) => {
            if(rowHeader === key){
                translatedRow[key] = domain[row[key]];
                if (field) translatedRow.__rowProps.entity[field] = domain[row[key]];
                translatedRow.__rowProps.fromTable[key] = row[key]
            }
            if(key === authFromTable.username) {
                translatedRow.__rowProps.auth.username = domain[row[key]]
            }
            if(key === authFromTable.password) {
                translatedRow.__rowProps.auth.password = domain[row[key]]
            }
        })
    })
    return translatedRow
}

export default function tableDrivenTests() {
    return async function (config: any, runner: any, { Test }: {Test: any}) {
        Test.macro('withTableData', translateTestData)
    }
  }


