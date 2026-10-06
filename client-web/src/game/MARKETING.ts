import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BUILDING13, BUILDING23, BUILDING25, BUILDING6, BUILDINGOPTIONS, BUILDINGS, GLOBAL, InstanceManager, KEYS, LOGGER, POPUPS, STORE, TUTORIAL } from "@game";

export class MARKETING extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: string): boolean {
        let tgtb: BFOUNDATION = null;
        let found: boolean = false;
        let pTitle: string = null;
        let pBody: string = null;
        let pImage: string = null;
        let pImagePosition: Point = null;
        let pButton: string = null;
        let pAction: Function = null;
        let popupMC: MovieClip = null;
        let tmpBuilding: BFOUNDATION = null;
        let tmpCountA: int = 0;
        let tmpCountB: int = 0;
        let buildingInstances: Vector<any> = null;
        let hatCount: int = 0;
        let siloCount: int = 0;
        let quantityIndex: int = 0;
        let canbuild: boolean = false;
        let tmpr1: boolean = false;
        let tmpr2: boolean = false;
        let tmpr3: boolean = false;
        let tmpr4: boolean = false;
        let sc: int = 0;
        tgtb = null;
        let storageInstances: Vector<any> = null;
        let laser: boolean = false;
        let tesla: boolean = false;
        let key: string = param1;
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return false;
        }
        if (BASE._showingWhatsNew) {
            return false;
        }
        if (BASE.isInfernoMainYardOrOutpost) {
            return false;
        }
        try {
            switch (key) {
                case "upgradeapult":
                    if (GLOBAL._bCatapult && GLOBAL._bCatapult._lvl.Get() == 1 && GLOBAL.townHall._lvl.Get() >= 5 && GLOBAL.Timestamp() - GLOBAL.StatGet("CM2") > 60 * 60 * 24 * 5) {
                        GLOBAL.StatSet("CM2", GLOBAL.Timestamp());
                        pTitle = KEYS.Get("mkting_upgradeapult_title");
                        pBody = KEYS.Get("mkting_upgradeapult_body");
                        pImage = "building-catapult.png";
                        pImagePosition = new Point(-270, -65);
                        pButton = KEYS.Get("mkting_upgradeapult_btn");
                        pAction = (param1: MouseEvent): void => {
                            BUILDINGOPTIONS.Show(GLOBAL._bCatapult, "upgrade");
                            POPUPS.Next();
                        };
                        found = true;
                    }
                    break;
                case "fillapult":
                    if (GLOBAL._bCatapult && BASE._resources.r1.Get() < BASE._resources.r1max * 0.5 && GLOBAL.Timestamp() - GLOBAL.StatGet("CM4") > 60 * 60 * 24 * 5) {
                        GLOBAL.StatSet("CM4", GLOBAL.Timestamp());
                        pTitle = KEYS.Get("mkting_fillapult_title");
                        pBody = KEYS.Get("mkting_fillapult_body");
                        pImage = "building-catapult.png";
                        pImagePosition = new Point(-270, -65);
                        pButton = KEYS.Get("mkting_fillapult_btn");
                        pAction = (param1: MouseEvent): void => {
                            if (!BASE.isInfernoMainYardOrOutpost) {
                                STORE.ShowB(2, 0, ["BR11", "BR12", "BR13", "BR21", "BR22", "BR23", "BR31", "BR32", "BR33", "BR41", "BR42", "BR43"]);
                            } else {
                                STORE.ShowB(2, 0, ["BR11I", "BR12I", "BR13I", "BR21I", "BR22I", "BR23I", "BR31I", "BR32I", "BR33I", "BR41I", "BR42I", "BR43I"]);
                            }
                            POPUPS.Next();
                        };
                        found = true;
                    }
                    break;
                case "train":
                    break;
                case "overdrive":
                    tmpCountA = 0;
                    tmpCountB = 0;
                    buildingInstances = InstanceManager.getInstancesByClass(BFOUNDATION);
                    for (tmpBuilding of (buildingInstances ?? [])) {
                        if (tmpBuilding._type == 13) {
                            tmpCountA += 1;
                            if ((as3.as(tmpBuilding, BUILDING13))._producing) {
                                tmpCountB += 1;
                            }
                        }
                    }
                    if (tmpCountA > 1 && tmpCountA == tmpCountB && GLOBAL.Timestamp() - GLOBAL.StatGet("CM6") > 60 * 60 * 24 * 2) {
                        GLOBAL.StatSet("CM6", GLOBAL.Timestamp());
                        pTitle = KEYS.Get("mkting_overdrive_title");
                        pBody = KEYS.Get("mkting_overdrive_body");
                        pImage = "building-hatchery.png";
                        pImagePosition = new Point(-270, -65);
                        pButton = KEYS.Get("mkting_overdrive_btn");
                        pAction = (param1: MouseEvent): void => {
                            if (!BASE.isInfernoMainYardOrOutpost) {
                                STORE.ShowB(3, 1, ["HOD", "HOD2", "HOD3"]);
                            } else {
                                STORE.ShowB(3, 1, ["HODI", "HOD2I", "HOD3I"]);
                            }
                            POPUPS.Next();
                        };
                        found = true;
                    }
                    break;
                case "planner":
                    break;
                case "hcc":
                    hatCount = InstanceManager.getInstancesByClass(BUILDING13).length | 0;
                    if (!GLOBAL._bHatcheryCC && hatCount == 3 && GLOBAL.Timestamp() - GLOBAL.StatGet("CM8") > 60 * 60 * 24 * 5) {
                        GLOBAL.StatSet("CM8", GLOBAL.Timestamp());
                        pTitle = KEYS.Get("mkting_hcc_title");
                        pBody = KEYS.Get("mkting_hcc_body");
                        pImage = "building-hcc.png";
                        pImagePosition = new Point(-270, -65);
                        pButton = KEYS.Get("mkting_hcc_btn");
                        pAction = (param1: MouseEvent): void => {
                            BUILDINGS._menuA = 2;
                            BUILDINGS._menuB = 1;
                            BUILDINGS._page = 0;
                            BUILDINGS._buildingID = 16;
                            BUILDINGS.Show();
                            POPUPS.Next();
                        };
                        found = true;
                    }
                    break;
                case "storagemore":
                    siloCount = InstanceManager.getInstancesByClass(BUILDING6).length | 0;
                    quantityIndex = GLOBAL.townHall._lvl.Get() - 1 < GLOBAL._buildingProps[5].quantity.length ? (GLOBAL.townHall._lvl.Get() - 1) | 0 : (GLOBAL._buildingProps[5].quantity.length - 1) | 0;
                    canbuild = siloCount < GLOBAL._buildingProps[5].quantity[quantityIndex];
                    tmpr1 = BASE._resources.r1.Get() >= 0.8 * BASE._resources.r1max;
                    tmpr2 = BASE._resources.r2.Get() >= 0.8 * BASE._resources.r2max;
                    tmpr3 = BASE._resources.r3.Get() >= 0.8 * BASE._resources.r3max;
                    tmpr4 = BASE._resources.r4.Get() >= 0.8 * BASE._resources.r4max;
                    if (canbuild && (tmpr1 || tmpr2 || tmpr3 || tmpr4) && GLOBAL.Timestamp() - GLOBAL.StatGet("CM9") > 60 * 60 * 24 * 5) {
                        GLOBAL.StatSet("CM9", GLOBAL.Timestamp());
                        pTitle = KEYS.Get("mkting_silo_title");
                        pBody = BASE.isInfernoMainYardOrOutpost ? KEYS.Get("inf_mkting_silo_body") : KEYS.Get("mkting_silo_body");
                        pImage = "building-storage.png";
                        pButton = KEYS.Get("mkting_silo_btn");
                        pAction = (param1: MouseEvent): void => {
                            BUILDINGS._menuA = 1;
                            BUILDINGS._menuB = 1;
                            BUILDINGS._page = 0;
                            BUILDINGS._buildingID = 6;
                            BUILDINGS.Show();
                            POPUPS.Next();
                        };
                        found = true;
                    }
                    break;
                case "storageupgrade":
                    sc = 0;
                    storageInstances = InstanceManager.getInstancesByClass(BUILDING6);
                    for (tmpBuilding of (storageInstances ?? [])) {
                        if (!BASE.CanUpgrade(tmpBuilding).error && !tmpBuilding._repairing && tmpBuilding._countdownUpgrade.Get() == 0) {
                            tgtb = tmpBuilding;
                            sc++;
                            break;
                        }
                    }
                    quantityIndex = GLOBAL.townHall._lvl.Get() - 1 < GLOBAL._buildingProps[5].quantity.length ? (GLOBAL.townHall._lvl.Get() - 1) | 0 : (GLOBAL._buildingProps[5].quantity.length - 1) | 0;
                    canbuild = sc < GLOBAL._buildingProps[5].quantity[quantityIndex];
                    tmpr1 = BASE._resources.r1.Get() >= 0.8 * BASE._resources.r1max;
                    tmpr2 = BASE._resources.r2.Get() >= 0.8 * BASE._resources.r2max;
                    tmpr3 = BASE._resources.r3.Get() >= 0.8 * BASE._resources.r3max;
                    tmpr4 = BASE._resources.r4.Get() >= 0.8 * BASE._resources.r4max;
                    if (!canbuild && tgtb && (tmpr1 || tmpr2 || tmpr3 || tmpr4) && GLOBAL.Timestamp() - GLOBAL.StatGet("CM10") > 60 * 60 * 24 * 5) {
                        GLOBAL.StatSet("CM10", GLOBAL.Timestamp());
                        pTitle = KEYS.Get("mkting_siloupgrade_title");
                        pBody = KEYS.Get("mkting_siloupgrade_body");
                        pButton = KEYS.Get("mkting_siloupgrade_btn");
                        pImage = "building-storage.png";
                        pAction = (param1: MouseEvent): void => {
                            BUILDINGOPTIONS.Show(tgtb, "upgrade");
                            POPUPS.Next();
                        };
                        found = true;
                    }
                    break;
                case "mushroompick":
                    break;
                case "laser":
                    laser = InstanceManager.getInstancesByClass(BUILDING23).length > 0;
                    if (GLOBAL.townHall._lvl.Get() >= 4 && !laser && GLOBAL.Timestamp() - GLOBAL.StatGet("CM11") > 60 * 60 * 24 * 5) {
                        GLOBAL.StatSet("CM11", GLOBAL.Timestamp());
                        pTitle = KEYS.Get("mkting_laser_title");
                        pBody = KEYS.Get("mkting_laser_body");
                        pButton = KEYS.Get("mkting_laser_btn");
                        pImage = "building-laser.png";
                        pAction = (param1: MouseEvent): void => {
                            BUILDINGS._menuA = 3;
                            BUILDINGS._menuB = 1;
                            BUILDINGS._page = 0;
                            BUILDINGS._buildingID = 23;
                            BUILDINGS.Show();
                            POPUPS.Next();
                        };
                        found = true;
                    }
                    break;
                case "tesla":
                    tesla = InstanceManager.getInstancesByClass(BUILDING25).length > 0;
                    if (GLOBAL.townHall._lvl.Get() >= 4 && !tesla && GLOBAL.Timestamp() - GLOBAL.StatGet("CM12") > 60 * 60 * 24 * 5) {
                        GLOBAL.StatSet("CM12", GLOBAL.Timestamp());
                        pTitle = KEYS.Get("mkting_tesla_title");
                        pBody = KEYS.Get("mkting_tesla_body");
                        pButton = KEYS.Get("mkting_tesla_btn");
                        pImage = "building-tesla.png";
                        pAction = (param1: MouseEvent): void => {
                            BUILDINGS._menuA = 3;
                            BUILDINGS._menuB = 1;
                            BUILDINGS._page = 0;
                            BUILDINGS._buildingID = 25;
                            BUILDINGS.Show();
                            POPUPS.Next();
                        };
                        found = true;
                    }
            }
            if (found) {
                GLOBAL.StatSet("CM", GLOBAL.Timestamp());
                POPUPS.DisplayGeneric(pTitle, pBody, pButton, pImage, pAction);
                LOGGER.Stat([36, key]);
            }
        } catch (e) {
            LOGGER.Log("err", "MARKETING.Show " + key + " " + e.getStackTrace());
        }
        return found;
    }

    public static Process(): void {
        let done: boolean = false;
        try {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && TUTORIAL._stage > 200 && GLOBAL._sessionCount > 10 && GLOBAL.Timestamp() - GLOBAL.StatGet("CM") > 60 * 60 * 24 * 1) {
                GLOBAL.StatSet("CM", GLOBAL.Timestamp());
                done = MARKETING.Show("unlock");
                if (!done) {
                    done = MARKETING.Show("catapult");
                }
                if (!done) {
                    done = MARKETING.Show("upgradeapult");
                }
            }
        } catch (e) {
            LOGGER.Log("err", "MARKETING.Process " + e.getStackTrace());
        }
    }
}
