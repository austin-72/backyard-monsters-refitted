import * as as3 from "as3";
import { ASObject, Class, XML, uint } from "as3";
import { Point } from "flash/geom";
import { Dictionary, getDefinitionByName } from "flash/utils";
import { ExposedAccessor, ExposedDefinition, ExposedDefinitionManager, ExposedObject, ExposedObjectManager, ExposedReference, Warning } from "@game";

export class ExposedStructure extends ASObject {
    static {
        as3.fields(this, { m_Definition: null });
    }

    private static readonly REFERENCE_TYPE_TEMPLATE_NAME: string = "utils.exposed::ExposedReference.<";

    private static readonly VECTOR_TYPE_TEMPLATE_NAME: string = "__AS3__.vec::Vector.<";
    private m_Definition: ExposedDefinition;

    public $ctor(): void {
        super.$ctor();
        this.m_Definition = ExposedDefinitionManager.instance.FindOrCacheExposedDefinition(this);
    }

    protected _Init(): void {
    }

    protected _Destroy(): void {
    }

    public Init(): void {
        let _loc2_: string = null;
        let _loc3_: ExposedAccessor = null;
        let _loc4_: string = null;
        let _loc5_: uint = 0;
        let _loc6_: uint = 0;
        let _loc1_: Dictionary = this.m_Definition.GetAccessorsExposedFor(ExposedDefinition.EXPOSED_FOR_EDITOR);
        for (const $value of (_loc1_?.keys() ?? [])) {
            _loc2_ = as3.str($value);
            if (this[_loc2_] != null) {
                if (this[_loc2_] instanceof ExposedStructure) {
                    this[_loc2_].Init();
                } else {
                    _loc3_ = as3.cast(_loc1_.get(_loc2_), ExposedAccessor);
                    if ((_loc4_ = _loc3_.qualifiedClassName).indexOf(ExposedStructure.VECTOR_TYPE_TEMPLATE_NAME) != -1) {
                        _loc5_ = this[_loc2_].length >>> 0;
                        _loc6_ = 0;
                        while (_loc6_ < _loc5_) {
                            if (this[_loc2_][_loc6_] != null && this[_loc2_][_loc6_] instanceof ExposedStructure) {
                                this[_loc2_][_loc6_].Init();
                            }
                            _loc6_++;
                        }
                    }
                }
            }
        }
        this._Init();
    }

    public Destroy(): void {
        let _loc2_: string = null;
        let _loc3_: ExposedAccessor = null;
        let _loc4_: string = null;
        let _loc5_: uint = 0;
        let _loc6_: uint = 0;
        if (this.m_Definition == null) {
            return;
        }
        this._Destroy();
        let _loc1_: Dictionary = this.m_Definition.GetAccessorsExposedFor(ExposedDefinition.EXPOSED_FOR_EDITOR);
        for (const $value of (_loc1_?.keys() ?? [])) {
            _loc2_ = as3.str($value);
            if (this[_loc2_] != null) {
                if (this[_loc2_] instanceof ExposedStructure) {
                    this.DestroyExposedStructureProperty(as3.cast(this[_loc2_], ExposedStructure));
                    this[_loc2_] = null;
                } else {
                    _loc3_ = as3.cast(_loc1_.get(_loc2_), ExposedAccessor);
                    if ((_loc4_ = _loc3_.qualifiedClassName).indexOf(ExposedStructure.VECTOR_TYPE_TEMPLATE_NAME) != -1) {
                        _loc5_ = this[_loc2_].length >>> 0;
                        _loc6_ = 0;
                        while (_loc6_ < _loc5_) {
                            if (this[_loc2_][_loc6_] != null && this[_loc2_][_loc6_] instanceof ExposedStructure) {
                                this.DestroyExposedStructureProperty(as3.cast(this[_loc2_][_loc6_], ExposedStructure));
                            }
                            _loc6_++;
                        }
                        this[_loc2_].length = 0;
                        this[_loc2_] = null;
                    }
                }
            }
        }
        this.m_Definition = null;
    }

    private DestroyExposedStructureProperty(param1: ExposedStructure): void {
        if (param1 == null) {
            return;
        }
        if (param1 instanceof ExposedObject && ExposedObjectManager.instance.FindReferenceableObject((as3.as(param1, ExposedObject)).id) != null) {
            return;
        }
        param1.Destroy();
    }

    public SaveInitialStateToXML(): XML {
        return this.SaveState(ExposedDefinition.EXPOSED_FOR_EDITOR);
    }

    public SavePersistedStateToXML(): XML {
        return this.SaveState(ExposedDefinition.EXPOSED_FOR_SAVE);
    }

    public LoadState(param1: XML, param2: string): void {
        let propertyNode: XML = null;
        let propertyName: string = null;
        let propertyType: string = null;
        let exposedAccessor: ExposedAccessor = null;
        let propertyClass: any = null;
        let isVector: boolean = false;
        let propertyX: number = NaN;
        let propertyY: number = NaN;
        let propertyValue: string = null;
        let structureProperty: ExposedStructure = null;
        let savedLength: uint = 0;
        let elementNode: XML = null;
        let elementClass: any = null;
        let elementType: string = null;
        let vectorLength: uint = 0;
        let i: uint = 0;
        let elementX: number = NaN;
        let elementY: number = NaN;
        let elementIndex: uint = 0;
        let structureElement: ExposedStructure = null;
        let a_State: XML = param1;
        let a_ExposedFor: string = param2;
        if (a_State.attribute("type") != this.m_Definition.qualifiedClassName) {
            Warning.Show("Loading structure of type \'" + this.m_Definition.qualifiedClassName + "\' with state of type \'" + a_State.attribute("type") + "\'.", ExposedStructure);
        }
        for (propertyNode of (a_State.child("property") ?? [])) {
            propertyName = as3.str(propertyNode.attribute("name"));
            propertyType = as3.str(propertyNode.attribute("type"));
            exposedAccessor = this.m_Definition.FindExposedAccessor(propertyName, a_ExposedFor);
            if (exposedAccessor == null) {
                Warning.Show("Loading property \'" + propertyName + "\' of type \'" + propertyType + "\' but it\'s accessor has not been exposed for " + a_ExposedFor, ExposedStructure);
            } else {
                propertyClass = exposedAccessor.classType;
                if (ExposedDefinitionManager.instance.IsPrimitiveType(propertyType) == true) {
                    switch (propertyClass) {
                        case uint:
                            this[propertyName] = Math.max(Number(propertyNode), 0);
                            break;
                        case Boolean:
                            this[propertyName] = propertyNode == "true";
                            break;
                        default:
                            this[propertyName] = propertyNode;
                    }
                } else if (propertyClass == Point) {
                    propertyX = Number(propertyNode.child("property").filter(($node: any) => $node.attribute("name") == "x"));
                    propertyY = Number(propertyNode.child("property").filter(($node1: any) => $node1.attribute("name") == "y"));
                    if (this[propertyName] == null) {
                        this[propertyName] = new Point(propertyX, propertyY);
                    } else {
                        this[propertyName].x = propertyX;
                        this[propertyName].y = propertyY;
                    }
                } else if (propertyType.indexOf(ExposedStructure.REFERENCE_TYPE_TEMPLATE_NAME) != -1) {
                    ExposedObjectManager.instance.AddReferenceToResolve(new ExposedReference(this, exposedAccessor, as3.str(propertyNode)));
                } else {
                    isVector = propertyType.indexOf(ExposedStructure.VECTOR_TYPE_TEMPLATE_NAME) != -1;
                    if (!isVector && ExposedDefinitionManager.instance.DoesInheritFrom(propertyClass, ExposedStructure)) {
                        propertyValue = as3.str(propertyNode);
                        if (propertyValue == null || propertyValue == "") {
                            this[propertyName] = null;
                        } else {
                            if (this[propertyName] == null) {
                                this[propertyName] = new propertyClass();
                            }
                            structureProperty = as3.as(this[propertyName], ExposedStructure);
                            if (as3.is(structureProperty, propertyClass) || ExposedDefinitionManager.instance.DoesInheritFrom(propertyClass, structureProperty.m_Definition.classType)) {
                                structureProperty.LoadState(propertyNode, a_ExposedFor);
                            } else {
                                Warning.Show("Loading structure property \'" + propertyName + "\' of type \'" + propertyType + "\' but it\'s existing structure is of unrelated type \'" + structureProperty.m_Definition.qualifiedClassName + "\'.", ExposedStructure);
                            }
                        }
                    } else if (isVector) {
                        savedLength = Number(propertyNode.attribute("length")) >>> 0;
                        if (savedLength != 0) {
                            if (this[propertyName] == null || this[propertyName].length == 0) {
                                this[propertyName] = new propertyClass(savedLength);
                            } else if (this[propertyName].length != savedLength) {
                                Warning.Show("Loading vector of properties \'" + propertyName + "\' of type \'" + propertyType + "\' with current length \'" + this[propertyName].length + "\' that was saved with length \'" + savedLength + "\'.", ExposedStructure);
                                vectorLength = this[propertyName].length >>> 0;
                                i = 0;
                                while (i < vectorLength) {
                                    if (this[propertyName][i] != null && this[propertyName][i] instanceof ExposedStructure) {
                                        this.DestroyExposedStructureProperty(as3.cast(this[propertyName][i], ExposedStructure));
                                    }
                                    i++;
                                }
                                this[propertyName].length = 0;
                                this[propertyName] = new propertyClass(savedLength);
                            }
                            elementNode = null;
                            elementClass = null;
                            elementType = propertyType.replace(ExposedStructure.VECTOR_TYPE_TEMPLATE_NAME, "").replace(">", "");
                            if (ExposedDefinitionManager.instance.IsPrimitiveType(elementType) == true) {
                                if (propertyType != exposedAccessor.qualifiedClassName) {
                                    Warning.Show("Loading vector of primitive properties \'" + propertyName + "\' of type \'" + propertyType + "\' but it\'s accessor is of type \'" + exposedAccessor.qualifiedClassName + "\'.", ExposedStructure);
                                } else {
                                    elementClass = as3.as(getDefinitionByName(elementType), Class);
                                    switch (elementClass) {
                                        case uint:
                                            for (elementNode of (propertyNode.child("element") ?? [])) {
                                                this[propertyName][elementNode.attribute("index")] = Math.max(Number(elementNode), 0);
                                            }
                                            break;
                                        case Boolean:
                                            for (elementNode of (propertyNode.child("element") ?? [])) {
                                                this[propertyName][elementNode.attribute("index")] = elementNode == "true";
                                            }
                                            break;
                                        default:
                                            for (elementNode of (propertyNode.child("element") ?? [])) {
                                                this[propertyName][elementNode.attribute("index")] = elementNode;
                                            }
                                    }
                                }
                            } else if (elementType.indexOf(ExposedStructure.REFERENCE_TYPE_TEMPLATE_NAME) != -1) {
                                for (elementNode of (propertyNode.child("element") ?? [])) {
                                    ExposedObjectManager.instance.AddReferenceToResolve(new ExposedReference(this, exposedAccessor, as3.str(elementNode), Number(elementNode.attribute("index")) | 0));
                                }
                            } else {
                                elementClass = as3.as(getDefinitionByName(elementType), Class);
                                if (elementClass == Point) {
                                    for (elementNode of (propertyNode.child("element") ?? [])) {
                                        elementX = Number(elementNode.child("property").filter(($node2: any) => $node2.attribute("name") == "x"));
                                        elementY = Number(elementNode.child("property").filter(($node3: any) => $node3.attribute("name") == "y"));
                                        if (this[propertyName][elementNode.attribute("index")] == null) {
                                            this[propertyName][elementNode.attribute("index")] = new Point(elementX, elementY);
                                        } else {
                                            this[propertyName][elementNode.attribute("index")].x = elementX;
                                            this[propertyName][elementNode.attribute("index")].y = elementY;
                                        }
                                    }
                                } else if (elementClass == null) {
                                    Warning.Show("Loading vector of properties \'" + propertyName + "\' of type \'" + propertyType + "\' that cannot be found.", ExposedStructure);
                                } else if (!ExposedDefinitionManager.instance.DoesInheritFrom(elementClass, ExposedStructure)) {
                                    Warning.Show("Loading vector of properties \'" + propertyName + "\' of type \'" + propertyType + "\' that is not currently supported.", ExposedStructure);
                                } else {
                                    for (elementNode of (propertyNode.child("element") ?? [])) {
                                        elementIndex = Number(elementNode.attribute("index")) >>> 0;
                                        if (this[propertyName][elementIndex] == null) {
                                            this[propertyName][elementIndex] = new elementClass();
                                        }
                                        structureElement = as3.as(this[propertyName][elementIndex], ExposedStructure);
                                        if (as3.is(structureElement, elementClass) || ExposedDefinitionManager.instance.DoesInheritFrom(elementClass, structureElement.m_Definition.classType)) {
                                            structureElement.LoadState(elementNode, a_ExposedFor);
                                        } else {
                                            Warning.Show("Loading structure property in vector \'" + propertyName + "\' of type \'" + propertyType + "\' at index \'" + elementIndex + "\' but the existing structure at that index is of unrelated type \'" + structureElement.m_Definition.qualifiedClassName + "\'.", ExposedStructure);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        Warning.Show("Loading property \'" + propertyName + "\' of type \'" + propertyType + "\' that is not currently supported.", ExposedStructure);
                    }
                }
            }
        }
    }

    public SaveState(param1: string): XML {
        let _loc4_: ExposedAccessor = null;
        let _loc5_: string = null;
        let _loc6_: string = null;
        let _loc7_: XML = null;
        let _loc8_: ExposedObject = null;
        let _loc9_: ExposedObject = null;
        let _loc10_: uint = 0;
        let _loc11_: uint = 0;
        let _loc12_: XML = null;
        let _loc13_: string = null;
        let _loc14_: any = null;
        let _loc15_: ExposedObject = null;
        let _loc16_: ExposedObject = null;
        let _loc2_: XML = XML.from("<structure/>");
        _loc2_.setAttribute("type", this.m_Definition.qualifiedClassName);
        let _loc3_: Dictionary = this.m_Definition.GetAccessorsExposedFor(param1);
        for (_loc4_ of (_loc3_?.values() ?? [])) {
            _loc5_ = String(_loc4_.name);
            _loc6_ = _loc4_.qualifiedClassName;
            (_loc7_ = XML.from("<property/>")).setAttribute("name", _loc5_);
            _loc7_.setAttribute("type", _loc6_);
            if (this[_loc5_] == null) {
                _loc2_.appendChild(_loc7_);
                if (ExposedDefinitionManager.instance.DoesInheritFrom(_loc4_.classType, ExposedObject)) {
                    _loc7_.setAttribute("type", ExposedStructure.REFERENCE_TYPE_TEMPLATE_NAME + _loc6_ + ">");
                }
            } else if (ExposedDefinitionManager.instance.IsPrimitiveType(_loc6_) == true) {
                _loc7_.setChildren(this[_loc5_]);
                _loc2_.appendChild(_loc7_);
            } else if (this[_loc5_] instanceof Point) {
                _loc7_.appendChild(new XML("<property name=\'x\' type=\'Number\'>" + (!(!this[_loc5_]) ? this[_loc5_].x : 0) + "</property>"));
                _loc7_.appendChild(new XML("<property name=\'y\' type=\'Number\'>" + (!(!this[_loc5_]) ? this[_loc5_].y : 0) + "</property>"));
                _loc2_.appendChild(_loc7_);
            } else {
                if (this[_loc5_] instanceof ExposedObject) {
                    _loc8_ = as3.as(this[_loc5_], ExposedObject);
                    if ((_loc9_ = ExposedObjectManager.instance.FindReferenceableObject(_loc8_.id)) != null) {
                        if (_loc8_ != _loc9_) {
                            Warning.Show("Saving reference property \'" + _loc5_ + "\' of type \'" + _loc6_ + "\' but the referenceable object found does not match.", ExposedStructure);
                        } else {
                            _loc7_.setAttribute("type", ExposedStructure.REFERENCE_TYPE_TEMPLATE_NAME + _loc6_ + ">");
                            _loc7_.appendChild(_loc8_.id);
                            _loc2_.appendChild(_loc7_);
                        }
                        continue;
                    }
                }
                if (this[_loc5_] instanceof ExposedStructure) {
                    (_loc7_ = as3.cast(this[_loc5_].SaveState(param1), XML)).setName("property");
                    _loc7_.setAttribute("name", _loc5_);
                    _loc2_.appendChild(_loc7_);
                } else if (_loc6_.indexOf(ExposedStructure.VECTOR_TYPE_TEMPLATE_NAME) != -1) {
                    _loc10_ = this[_loc5_].length >>> 0;
                    _loc7_.setAttribute("length", _loc10_);
                    if (_loc10_ == 0) {
                        _loc2_.appendChild(_loc7_);
                    } else {
                        _loc11_ = 0;
                        _loc12_ = null;
                        _loc13_ = _loc6_.replace(ExposedStructure.VECTOR_TYPE_TEMPLATE_NAME, "").replace(">", "");
                        if (ExposedDefinitionManager.instance.IsPrimitiveType(_loc13_) == true) {
                            _loc11_ = 0;
                            while (_loc11_ < _loc10_) {
                                (_loc12_ = XML.from("<element/>")).setAttribute("type", _loc13_);
                                _loc12_.setAttribute("index", _loc11_);
                                _loc12_.setChildren(this[_loc5_][_loc11_]);
                                _loc7_.appendChild(_loc12_);
                                _loc11_++;
                            }
                            _loc2_.appendChild(_loc7_);
                        } else {
                            if (this[_loc5_][0] instanceof Point) {
                                _loc11_ = 0;
                                while (_loc11_ < _loc10_) {
                                    (_loc12_ = XML.from("<element/>")).setAttribute("type", _loc13_);
                                    _loc12_.setAttribute("index", _loc11_);
                                    _loc12_.appendChild(new XML("<property name=\'x\' type=\'Number\'>" + (!(!this[_loc5_][_loc11_]) ? this[_loc5_][_loc11_].x : 0) + "</property>"));
                                    _loc12_.appendChild(new XML("<property name=\'y\' type=\'Number\'>" + (!(!this[_loc5_][_loc11_]) ? this[_loc5_][_loc11_].y : 0) + "</property>"));
                                    _loc7_.appendChild(_loc12_);
                                    _loc11_++;
                                }
                                _loc2_.appendChild(_loc7_);
                            }
                            if (this[_loc5_][0] instanceof ExposedObject) {
                                _loc14_ = ExposedStructure.REFERENCE_TYPE_TEMPLATE_NAME + _loc13_ + ">";
                                _loc11_ = 0;
                                while (_loc11_ < _loc10_) {
                                    if (this[_loc5_][_loc11_] == null) {
                                        Warning.Show("Saving reference property in vector \'" + _loc5_ + "\' of type \'" + _loc6_ + "\' at index \'" + _loc11_ + "\' but the element is null.", ExposedStructure);
                                    } else {
                                        _loc15_ = as3.as(this[_loc5_][_loc11_], ExposedObject);
                                        _loc16_ = ExposedObjectManager.instance.FindReferenceableObject(_loc15_.id);
                                        if (_loc15_ != _loc16_) {
                                            Warning.Show("Saving reference property in vector \'" + _loc5_ + "\' of type \'" + _loc6_ + "\' at index \'" + _loc11_ + "\' but the referenceable object found does not match.", ExposedStructure);
                                        } else {
                                            (_loc12_ = XML.from("<element/>")).setAttribute("type", _loc14_);
                                            _loc12_.setAttribute("index", _loc11_);
                                            _loc12_.appendChild(_loc15_.id);
                                            _loc7_.appendChild(_loc12_);
                                        }
                                    }
                                    _loc11_++;
                                }
                                _loc2_.appendChild(_loc7_);
                            } else if (this[_loc5_][0] instanceof ExposedStructure) {
                                _loc11_ = 0;
                                while (_loc11_ < _loc10_) {
                                    if (this[_loc5_][_loc11_] == null) {
                                        Warning.Show("Saving strcture property in vector \'" + _loc5_ + "\' of type \'" + _loc6_ + "\' at index \'" + _loc11_ + "\' but the element is null.", ExposedStructure);
                                    } else {
                                        (_loc12_ = as3.cast(this[_loc5_][_loc11_].SaveState(param1), XML)).setName("element");
                                        _loc12_.setAttribute("index", _loc11_);
                                        _loc7_.appendChild(_loc12_);
                                    }
                                    _loc11_++;
                                }
                                _loc2_.appendChild(_loc7_);
                            } else {
                                Warning.Show("Saving vector property \'" + _loc5_ + "\' of type \'" + _loc6_ + "\' with elements of unknown type \'" + _loc13_, ExposedStructure);
                            }
                        }
                    }
                } else {
                    Warning.Show("Saving property \'" + _loc5_ + "\' of unknown type \'" + _loc6_, ExposedStructure);
                }
            }
        }
        return _loc2_;
    }
}
