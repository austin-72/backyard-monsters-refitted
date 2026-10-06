import * as as3 from "as3";
import { uint } from "as3";
import { Component } from "@game";

export interface IComponentOwner {
    addComponent(param1: Component, param2?: string, param3?: uint): void;

    removeComponent(param1: Component): void;

    getComponent(param1: Component): Component;

    getComponentByType(param1: any): Component;

    getComponentByName(param1: string): Component;
}
export const IComponentOwner = as3.iface("com.monsters.monsters::IComponentOwner", []);
