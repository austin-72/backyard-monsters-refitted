import * as as3 from "as3";
import { ASObject, Vector, XML, int, uint } from "as3";
import { Dictionary } from "flash/utils";
import { ExposedCollection, ExposedDefinition, ExposedObject, ExposedReference, SingletonLock, Warning } from "@game";

export class ExposedObjectManager extends ASObject {
    static {
        as3.fields(this, { m_ReferenceableObjects: null, m_ReferencesToResolve: null, m_ReferenceLoadingBlockCounter: 0 });
    }

    private static s_Instance: ExposedObjectManager = null;
    private m_ReferenceableObjects: Dictionary;
    private m_ReferencesToResolve: Vector<ExposedReference>;
    private m_ReferenceLoadingBlockCounter: int;

    public $ctor(param1?: SingletonLock): void {
        this.m_ReferenceableObjects = new Dictionary();
        this.m_ReferencesToResolve = new Vector<ExposedReference>(0, false, ExposedReference);
        super.$ctor();
    }

    public static get instance(): ExposedObjectManager {
        return ExposedObjectManager.s_Instance = ExposedObjectManager.s_Instance || new ExposedObjectManager(new SingletonLock());
    }

    public LoadExposedCollection(param1: XML, param2: XML = null): ExposedCollection {
        let _loc3_: ExposedCollection = new ExposedCollection();
        this.BeginReferenceLoadingBlock();
        _loc3_.LoadState(param1, ExposedDefinition.EXPOSED_FOR_EDITOR);
        if (param2 != null) {
            _loc3_.LoadState(param2, ExposedDefinition.EXPOSED_FOR_LOAD);
        }
        this.EndReferenceLoadingBlock();
        _loc3_.Init();
        return _loc3_;
    }

    public RegisterReferenceableObject(param1: ExposedObject): void {
        if (this.m_ReferenceableObjects.get(param1.id) != null) {
            Warning.Show("Trying to registering referenceable object \'" + param1.id + "\' that has already been registered.", ExposedObjectManager);
            return;
        }
        this.m_ReferenceableObjects.set(param1.id, param1);
    }

    public DeregisterReferenceableObject(param1: ExposedObject): void {
        this.m_ReferenceableObjects.set(param1.id, null);
        this.m_ReferenceableObjects.delete(param1.id);
    }

    public FindReferenceableObject(param1: string): ExposedObject {
        return as3.as(this.m_ReferenceableObjects.get(param1), ExposedObject);
    }

    public BeginReferenceLoadingBlock(): void {
        ++this.m_ReferenceLoadingBlockCounter;
    }

    public EndReferenceLoadingBlock(): void {
        --this.m_ReferenceLoadingBlockCounter;
        if (this.m_ReferenceLoadingBlockCounter < 0) {
            Warning.Show("Reference loading block mis-match.", ExposedObjectManager);
            this.m_ReferenceLoadingBlockCounter = 0;
        }
        if (this.m_ReferenceLoadingBlockCounter == 0) {
            this.ResolveReferences();
        }
    }

    public AddReferenceToResolve(param1: ExposedReference): void {
        if (this.m_ReferenceLoadingBlockCounter <= 0) {
            Warning.Show("AddReferenceToResolve called outside of a reference loading block.", ExposedObjectManager);
            return;
        }
        this.m_ReferencesToResolve.push(param1);
    }

    private ResolveReferences(): void {
        let _loc3_: ExposedReference = null;
        let _loc4_: ExposedObject = null;
        let _loc1_: uint = this.m_ReferencesToResolve.length >>> 0;
        let _loc2_: uint = 0;
        while (_loc2_ < _loc1_) {
            _loc3_ = as3.vget(this.m_ReferencesToResolve, _loc2_);
            if (_loc3_.referencedObjectId == null || _loc3_.referencedObjectId == "") {
                _loc3_.exposedStructure[_loc3_.exposedAccessor.name] = null;
                _loc3_.Destroy();
            } else if ((_loc4_ = this.FindReferenceableObject(_loc3_.referencedObjectId)) == null) {
                Warning.Show("Resolving reference \'" + _loc3_.referencedObjectId + "\' for accessor \'" + _loc3_.exposedAccessor.name + "\' of type \'" + _loc3_.exposedAccessor.qualifiedClassName + "\' but we couldn\'t find the referenced object.", ExposedObjectManager);
                _loc3_.exposedStructure[_loc3_.exposedAccessor.name] = null;
                _loc3_.Destroy();
            } else if (_loc3_.vectorIndex >= 0) {
                if (_loc3_.vectorIndex >= _loc3_.exposedStructure[_loc3_.exposedAccessor.name].length) {
                    Warning.Show("Resolving reference \'" + _loc3_.referencedObjectId + "\' for accessor \'" + _loc3_.exposedAccessor.name + "\' of type \'" + _loc3_.exposedAccessor.qualifiedClassName + "\' at index \'" + _loc3_.vectorIndex + "\' that is greater than length \'" + this[_loc3_.exposedAccessor.name].length + "\'.", ExposedObjectManager);
                    _loc3_.exposedStructure[_loc3_.exposedAccessor.name][_loc3_.vectorIndex] = null;
                } else {
                    _loc3_.exposedStructure[_loc3_.exposedAccessor.name][_loc3_.vectorIndex] = _loc4_;
                }
                _loc3_.Destroy();
            } else if (!(as3.is(_loc4_, _loc3_.exposedAccessor.classType))) {
                Warning.Show("Resolving reference \'" + _loc3_.referencedObjectId + "\' for accessor \'" + _loc3_.exposedAccessor.name + "\' that is not of type \'" + _loc3_.exposedAccessor.qualifiedClassName + "\'.", ExposedObjectManager);
                _loc3_.exposedStructure[_loc3_.exposedAccessor.name] = null;
                _loc3_.Destroy();
            } else {
                _loc3_.exposedStructure[_loc3_.exposedAccessor.name] = _loc4_;
                _loc3_.Destroy();
            }
            _loc2_++;
        }
        as3.vsetLength(this.m_ReferencesToResolve, 0);
    }
}
