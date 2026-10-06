import * as as3 from "as3";
import { Class, Vector, XML, uint } from "as3";
import { System } from "flash/system";
import { getDefinitionByName } from "flash/utils";
import { ExposedDefinition, ExposedObject, ExposedObjectManager, Warning } from "@game";

export class ExposedCollection extends ExposedObject {
    static {
        as3.fields(this, { m_Contents: null, m_CachedContentsState: null, m_ContentsLoaded: true });
    }

    private m_Contents: Vector<ExposedObject>;
    private m_CachedContentsState: XML;
    private m_ContentsLoaded: boolean;

    public $ctor(): void {
        this.m_Contents = new Vector<ExposedObject>(0, false, ExposedObject);
        super.$ctor();
        this.m_ContentsLoaded = this.AreContentsLoadedByDefault();
    }

    public get contentsLoaded(): boolean {
        return this.m_ContentsLoaded;
    }

    public set contentsLoaded(param1: boolean) {
        this.m_ContentsLoaded = param1;
    }

    public override Init(): void {
        super.Init();
        if (this.m_ContentsLoaded) {
            this.InitContents();
        }
    }

    public override Destroy(): void {
        this.UnloadContents(false);
        super.Destroy();
    }

    protected AreContentsLoadedByDefault(): boolean {
        return true;
    }

    protected SaveContentsSeperately(): boolean {
        return false;
    }

    public FindChildObject(param1: string): ExposedObject {
        let _loc4_: ExposedObject = null;
        let _loc2_: uint = this.m_Contents.length >>> 0;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            if ((_loc4_ = as3.vget(this.m_Contents, _loc3_)).id == param1) {
                return _loc4_;
            }
            _loc3_++;
        }
        return null;
    }

    public FindAndRemoveChildObject(param1: string): ExposedObject {
        let _loc4_: ExposedObject = null;
        let _loc2_: uint = this.m_Contents.length >>> 0;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            if ((_loc4_ = as3.vget(this.m_Contents, _loc3_)).id == param1) {
                this.m_Contents.splice(_loc3_, 1);
                return _loc4_;
            }
            _loc3_++;
        }
        return null;
    }

    public LoadContents(): void {
        if (this.m_ContentsLoaded == true) {
            Warning.Show("Trying to load the contents of collection with id \'" + this.id + "\', but it\'s contents are already loaded.", ExposedCollection);
            return;
        }
        if (this.m_CachedContentsState == null) {
            Warning.Show("Trying to load the contents of collection with id \'" + this.id + "\', but it has no cached contents state.", ExposedCollection);
            return;
        }
        ExposedObjectManager.instance.BeginReferenceLoadingBlock();
        this.LoadContentsState(this.m_CachedContentsState, as3.str(this.m_CachedContentsState.attribute("exposedFor")));
        ExposedObjectManager.instance.EndReferenceLoadingBlock();
        this.InitContents();
        System.disposeXML(this.m_CachedContentsState);
        this.m_CachedContentsState = null;
        this.m_ContentsLoaded = true;
    }

    private InitContents(): void {
        let _loc1_: uint = this.m_Contents.length >>> 0;
        let _loc2_: uint = 0;
        while (_loc2_ < _loc1_) {
            as3.vget(this.m_Contents, _loc2_).Init();
            _loc2_++;
        }
    }

    public UnloadContents(param1: boolean = true): void {
        if (param1 == true) {
            this.m_CachedContentsState = this.SaveContentsState(ExposedDefinition.EXPOSED_FOR_SAVE);
            this.m_CachedContentsState.setAttribute("exposedFor", ExposedDefinition.EXPOSED_FOR_LOAD);
        }
        let _loc2_: uint = this.m_Contents.length >>> 0;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            ExposedObjectManager.instance.DeregisterReferenceableObject(as3.vget(this.m_Contents, _loc3_));
            as3.vget(this.m_Contents, _loc3_).Destroy();
            _loc3_++;
        }
        as3.vsetLength(this.m_Contents, 0);
        this.m_ContentsLoaded = false;
    }

    public SaveInitialContentsStateToXML(): XML {
        return this.SaveContentsState(ExposedDefinition.EXPOSED_FOR_EDITOR);
    }

    public SavePersistedContentsStateToXML(): XML {
        return this.SaveContentsState(ExposedDefinition.EXPOSED_FOR_SAVE);
    }

    public override LoadState(param1: XML, param2: string): void {
        let _loc3_: boolean = this.m_ContentsLoaded;
        super.LoadState(param1, param2);
        let _loc4_: XML = param1.child("contents")[0];
        if (_loc3_ && this.m_ContentsLoaded) {
            this.LoadContentsState(_loc4_, param2);
            return;
        }
        if (!_loc3_ && this.m_ContentsLoaded) {
            if (this.m_CachedContentsState != null) {
                this.LoadContentsState(this.m_CachedContentsState, as3.str(this.m_CachedContentsState.attribute("exposedFor")));
                System.disposeXML(this.m_CachedContentsState);
                this.m_CachedContentsState = null;
            }
            this.LoadContentsState(_loc4_, param2);
            return;
        }
        if (_loc3_ && !this.m_ContentsLoaded) {
            this.UnloadContents(false);
            this.m_CachedContentsState = _loc4_.copy();
            this.m_CachedContentsState.setAttribute("exposedFor", param2);
            return;
        }
        if (!_loc3_ && !this.m_ContentsLoaded) {
            this.m_CachedContentsState = _loc4_.copy();
            this.m_CachedContentsState.setAttribute("exposedFor", param2);
            return;
        }
    }

    public override SaveState(param1: string): XML {
        let _loc2_: XML = super.SaveState(param1);
        _loc2_.setName("collection");
        if (this.SaveContentsSeperately()) {
            return _loc2_;
        }
        if (this.m_ContentsLoaded) {
            _loc2_.appendChild(this.SaveContentsState(param1));
            return _loc2_;
        }
        if (this.m_CachedContentsState != null && this.m_CachedContentsState.attribute("exposedFor") == param1) {
            _loc2_.appendChild(this.m_CachedContentsState.copy());
            return _loc2_;
        }
        return _loc2_;
    }

    private LoadContentsState(param1: XML, param2: string): void {
        let _loc14_: any = undefined;
        let _loc8_: XML = null;
        let _loc11_: string = null;
        if (param1 == null) {
            return;
        }
        let _loc3_: uint = Number(param1.attribute("length")) >>> 0;
        let _loc4_: uint = 0;
        let _loc5_: ExposedObject = null;
        let _loc6_: any = null;
        let _loc7_: Vector<ExposedObject> = new Vector<ExposedObject>(_loc3_, false, ExposedObject);
        for (_loc8_ of (param1.child("object") ?? [])) {
            _loc11_ = String(_loc8_.attribute("id"));
            if ((_loc5_ = this.FindAndRemoveChildObject(_loc11_)) != null) {
                _loc5_.LoadState(_loc8_, param2);
                as3.vset(_loc7_, _loc14_ = _loc4_++, _loc5_);
            } else if ((_loc6_ = as3.as(getDefinitionByName(as3.str(_loc8_.attribute("type"))), Class)) != null) {
                (_loc5_ = as3.cast(new _loc6_(), ExposedObject)).id = _loc11_;
                _loc5_.LoadState(_loc8_, param2);
                as3.vset(_loc7_, _loc14_ = _loc4_++, _loc5_);
                ExposedObjectManager.instance.RegisterReferenceableObject(_loc5_);
            } else {
                Warning.Show("Object \'" + _loc8_.attribute("id") + "\' of unknown type \'" + _loc8_.attribute("type") + " found while loading the contents state of collection with id \'" + this.id + "\'.", ExposedCollection);
            }
        }
        if (_loc4_ != _loc3_) {
            Warning.Show("While loading the contents state of collection with id \'" + this.id + "\', we were only able to process \'" + _loc4_ + "\' nodes, but the number of nodes saved was \'" + _loc3_ + "\'.", ExposedCollection);
            as3.vsetLength(_loc7_, _loc4_);
        }
        let _loc9_: uint = this.m_Contents.length >>> 0;
        let _loc10_: uint = 0;
        while (_loc10_ < _loc9_) {
            as3.vget(this.m_Contents, _loc10_).Destroy();
            _loc10_++;
        }
        as3.vsetLength(this.m_Contents, 0);
        this.m_Contents = _loc7_;
    }

    private SaveContentsState(param1: string): XML {
        let _loc5_: XML = null;
        let _loc2_: XML = XML.from("<contents/>");
        let _loc3_: uint = this.m_Contents.length >>> 0;
        _loc2_.setAttribute("length", _loc3_);
        let _loc4_: uint = 0;
        while (_loc4_ < _loc3_) {
            (_loc5_ = as3.vget(this.m_Contents, _loc4_).SaveState(param1)).setName("object");
            _loc2_.appendChild(_loc5_);
            _loc4_++;
        }
        return _loc2_;
    }
}
