import * as as3 from "as3";
import { ASObject, int } from "as3";

/**
 * Neutral key-value data container for chat system abstraction.
 * Replaces direct dependency on SmartFoxServer SFSObject type.
 */
export class ChatData extends ASObject {
    static {
        as3.fields(this, { _data: null });
    }

    private _data: any;

    public $ctor(): void {
        super.$ctor();
        this._data = {};
    }

    // String operations
    public putUtfString(key: string, value: string): void {
        this._data[key] = value;
    }

    public getUtfString(key: string): string {
        return as3.as(this._data[key], String);
    }

    // Integer operations
    public putInt(key: string, value: int): void {
        this._data[key] = value;
    }

    public getInt(key: string): int {
        return this._data[key] | 0;
    }

    // Long operations
    public putLong(key: string, value: number): void {
        this._data[key] = value;
    }

    public getLong(key: string): number {
        return Number(this._data[key]);
    }

    // Boolean operations
    public putBool(key: string, value: boolean): void {
        this._data[key] = value;
    }

    public getBool(key: string): boolean {
        return Boolean(this._data[key]);
    }

    // Number operations
    public putDouble(key: string, value: number): void {
        this._data[key] = value;
    }

    public getDouble(key: string): number {
        return Number(this._data[key]);
    }

    // Array operations
    public putArray(key: string, value: any[]): void {
        this._data[key] = value;
    }

    public getArray(key: string): any[] {
        return as3.as(this._data[key], Array);
    }

    // Nested ChatData operations
    public putChatData(key: string, value: ChatData): void {
        this._data[key] = value;
    }

    public getChatData(key: string): ChatData {
        return as3.as(this._data[key], ChatData);
    }

    // Generic operations
    public put(key: string, value: any): void {
        this._data[key] = value;
    }

    public get(key: string): any {
        return this._data[key];
    }

    public containsKey(key: string): boolean {
        return key in this._data;
    }

    public remove(key: string): void {
        delete this._data[key];
    }

    public get keys(): any[] {
        let result: any[] = [];
        for (let key in this._data) {
            result.push(key);
        }
        return result;
    }

    public get size(): int {
        let count: int = 0;
        for (let key in this._data) {
            count++;
        }
        return count;
    }

    /**
     * Returns raw data object for internal use
     */
    public get rawData(): any {
        return this._data;
    }
}
