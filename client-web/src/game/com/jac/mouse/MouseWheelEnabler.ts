import * as as3 from "as3";
import { ASObject, XML, int, uint } from "as3";
import { InteractiveObject, Stage } from "flash/display";
import { MouseEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { getTimer } from "flash/utils";
import { BrowserInfo, print } from "@game";

export class MouseWheelEnabler extends ASObject {
    private static initialised: boolean = false;

    private static currentItem: InteractiveObject = null;

    private static browserMouseEvent: MouseEvent = null;

    private static lastEventTime: uint = 0;

    public static useRawValues: boolean = false;

    public static eventTimeout: number = 50;

    public $ctor(): void {
        super.$ctor();
    }

    public static init(param1: Stage, param2: boolean = false): void {
        if (!MouseWheelEnabler.initialised) {
            MouseWheelEnabler.initialised = true;
            print("init mousewheel");
            MouseWheelEnabler.registerListenerForMouseMove(param1);
            MouseWheelEnabler.registerJS();
        }
        MouseWheelEnabler.useRawValues = param2;
    }

    private static registerListenerForMouseMove(param1: Stage): void {
        let stage: Stage = param1;
        stage.addEventListener(MouseEvent.MOUSE_MOVE, (param1: MouseEvent): void => {
            MouseWheelEnabler.currentItem = as3.cast(param1.target, InteractiveObject);
            MouseWheelEnabler.browserMouseEvent = as3.cast(param1, MouseEvent);
        });
    }

    private static registerJS(): void {
        let id: string = null;
        if (ExternalInterface.available) {
            id = "mws_" + Math.floor(Math.random() * 1000000);
            ExternalInterface.addCallback(id, (): void => {
            });
            ExternalInterface.call(as3.str(MouseWheelEnabler_JavaScript.CODE));
            ExternalInterface.call("mws.InitMouseWheelSupport", id);
            ExternalInterface.addCallback("externalMouseEvent", MouseWheelEnabler.handleExternalMouseEvent);
        }
    }

    private static handleExternalMouseEvent(param1: number, param2: number): void {
        let _loc3_: number = NaN;
        let _loc4_: uint = 0;
        if ((_loc4_ = getTimer() >>> 0) >= MouseWheelEnabler.eventTimeout + MouseWheelEnabler.lastEventTime) {
            if (MouseWheelEnabler.useRawValues) {
                _loc3_ = param1;
            } else {
                _loc3_ = param2;
            }
            if (Boolean(MouseWheelEnabler.currentItem) && Boolean(MouseWheelEnabler.browserMouseEvent)) {
                MouseWheelEnabler.currentItem.dispatchEvent(new MouseEvent(MouseEvent.MOUSE_WHEEL, true, false, MouseWheelEnabler.browserMouseEvent.localX, MouseWheelEnabler.browserMouseEvent.localY, MouseWheelEnabler.browserMouseEvent.relatedObject, MouseWheelEnabler.browserMouseEvent.ctrlKey, MouseWheelEnabler.browserMouseEvent.altKey, MouseWheelEnabler.browserMouseEvent.shiftKey, MouseWheelEnabler.browserMouseEvent.buttonDown, _loc3_ | 0));
            }
            MouseWheelEnabler.lastEventTime = _loc4_;
        }
    }

    public static getBrowserInfo(): BrowserInfo {
        let _loc1_: any = null;
        let _loc2_: any = null;
        let _loc3_: string = null;
        if (ExternalInterface.available) {
            _loc1_ = ExternalInterface.call("mws.getBrowserInfo");
            _loc2_ = ExternalInterface.call("mws.getPlatformInfo");
            _loc3_ = as3.str(ExternalInterface.call("mws.getAgentInfo"));
            return new BrowserInfo(_loc1_, _loc2_, _loc3_);
        }
        return null;
    }
}

class MouseWheelEnabler_JavaScript extends ASObject {
    public static readonly CODE: XML = XML.from("<script><![CDATA[\n\t\tfunction()\n\t\t{\n\t\t\t// create unique namespace\n\t\t\tif(typeof mws == \"undefined\" || !mws)\t\n\t\t\t{\n\t\t\t\tmws = {};\n\t\t\t}\n\t\t\t\n\t\t\tvar userAgent = navigator.userAgent.toLowerCase();\n\t\t\tmws.agent = userAgent;\n\t\t\tmws.platform = \n\t\t\t{\n\t\t\t\twin:/win/.test(userAgent),\n\t\t\t\tmac:/mac/.test(userAgent),\n\t\t\t\tother:!/win/.test(userAgent) && !/mac/.test(userAgent)\n\t\t\t};\n\t\t\t\n\t\t\tmws.vars = {};\n\t\t\t\n\t\t\tmws.browser = \n\t\t\t{\n\t\t\t\tversion: (userAgent.match(/.+(?:rv|it|ra|ie)[\\/: ]([\\d.]+)/) || [])[1],\n\t\t\t\tsafari: /webkit/.test(userAgent) && !/chrome/.test(userAgent),\n\t\t\t\topera: /opera/.test(userAgent),\n\t\t\t\tmsie: /msie/.test(userAgent) && !/opera/.test(userAgent),\n\t\t\t\tmozilla: /mozilla/.test(userAgent) && !/(compatible|webkit)/.test(userAgent),\n\t\t\t\tchrome: /chrome/.test(userAgent)\n\t\t\t};\n\t\t\t\n\t\t\t// find the function we added\n\t\t\tmws.findSwf = function(id) \n\t\t\t{\n\t\t\t\tvar objects = document.getElementsByTagName(\"object\");\n\t\t\t\tfor(var i = 0; i < objects.length; i++)\n\t\t\t\t{\n\t\t\t\t\tif(typeof objects[i][id] != \"undefined\")\n\t\t\t\t\t{\n\t\t\t\t\t\treturn objects[i];\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\tvar embeds = document.getElementsByTagName(\"embed\");\n\t\t\t\t\n\t\t\t\tfor(var j = 0; j < embeds.length; j++)\n\t\t\t\t{\n\t\t\t\t\tif(typeof embeds[j][id] != \"undefined\")\n\t\t\t\t\t{\n\t\t\t\t\t\treturn embeds[j];\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\t\t\n\t\t\t\treturn null;\n\t\t\t}\n\t\t\t\n\t\t\tmws.usingWmode = function( swf )\n\t\t\t{\n\t\t\t\tif( typeof swf.getAttribute == \"undefined\" )\n\t\t\t\t{\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\tvar wmode = swf.getAttribute( \"wmode\" );\n\t\t\t\tif( typeof wmode == \"undefined\" )\n\t\t\t\t{\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\treturn true;\n\t\t\t}\n\t\t\t\n\t\t\t//Debug logging\n\t\t\tmws.log = function( message ) \n\t\t\t{\n\t\t\t\tif( typeof console != \"undefined\" )\n\t\t\t\t{\n\t\t\t\t\tconsole.log( message );\n\t\t\t\t}\n\t\t\t\telse\n\t\t\t\t{\n\t\t\t\t\t//alert( message );\n\t\t\t\t}\n\t\t\t}\n\t\t\t\n\t\t\tmws.shouldAddHandler = function( swf )\n\t\t\t{\n\t\t\t\tif( !swf )\n\t\t\t\t{\n\t\t\t\t\treturn false;\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\treturn true;\n\t\t\t}\n\t\t\t\n\t\t\tmws.getBrowserInfo = function()\n\t\t\t{//getBrowserObj\n\t\t\t\treturn mws.browser;\n\t\t\t}//getBrowserObj\n\t\t\t\n\t\t\tmws.getAgentInfo = function()\n\t\t\t{//getAgentInfo\n\t\t\t\treturn mws.agent;\n\t\t\t}//getAgentInfo\n\t\t\t\n\t\t\tmws.getPlatformInfo = function()\n\t\t\t{//getPlatformInfo\n\t\t\t\treturn mws.platform;\n\t\t\t}//getPlatformInfo\n\t\t\t\n\t\t\tmws.addScrollListeners = function()\n\t\t\t{//addScrollListeners\n\t\t\t\t\n\t\t\t\t// install mouse listeners\n\t\t\t\tif(typeof window.addEventListener != 'undefined') \n\t\t\t\t{\n\t\t\t\t\twindow.addEventListener('DOMMouseScroll', _mousewheel, false);\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\twindow.onmousewheel = document.onmousewheel = _mousewheel;\n\t\t\t\t\n\t\t\t}//addScrollListeners\n\t\t\t\n\t\t\tmws.removeScrollListeners = function()\n\t\t\t{//removeScrollListeners\n\t\t\t\t// install mouse listeners\n\t\t\t\tif(typeof window.removeEventListener != 'undefined') \n\t\t\t\t{\n\t\t\t\t\twindow.removeEventListener('DOMMouseScroll', _mousewheel, false);\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\twindow.onmousewheel = document.onmousewheel = null;\n\t\t\t}//removeScrollListeners\n\t\t\t\n\t\t\tmws.InitMouseWheelSupport = function(id) \n\t\t\t{//InitMouseWheelSupport\n\t\t\t\t//grab reference to the swf\n\t\t\t\tvar swf = mws.findSwf(id);\n\t\t\t\t\n\t\t\t\t//see if we can add the mouse listeners\n\t\t\t\tvar shouldAdd = mws.shouldAddHandler( swf );\n\t\t\t\t\n\t\t\t\tif( shouldAdd ) \n\t\t\t\t{\n\t\t\t\t\t/// Mousewheel support\n\t\t\t\t\t_mousewheel = function(event) \n\t\t\t\t\t{//Mouse Wheel\n\t\t\t\t\t\t\t\n\t\t\t\t\t\t//Cover for IE\n\t\t\t\t\t\tif (!event) event = window.event;\n\t\t\t\t\t\t\n\t\t\t\t\t\tvar rawDelta = 0;\n\t\t\t\t\t\tvar divisor = 1;\n\t\t\t\t\t\tvar scaledDelta = 0;\n\t\t\t\t\t\t\n\t\t\t\t\t\t//Handle scaling the delta.\n\t\t\t\t\t\t//This is becoming less and less useful as more browser/hardware combos emerge.\n\t\t\t\t\t\tif(event.wheelDelta)\t\n\t\t\t\t\t\t{//normal event\n\t\t\t\t\t\t\trawDelta = event.wheelDelta;\n\t\t\t\t\t\t\t\n\t\t\t\t\t\t\tif(mws.browser.opera)\n\t\t\t\t\t\t\t{\n\t\t\t\t\t\t\t\tdivisor = 12;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\telse if(mws.browser.safari && mws.browser.version.split(\".\")[0] >= 528)\n\t\t\t\t\t\t\t{\n\t\t\t\t\t\t\t\tdivisor = 12;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\telse\n\t\t\t\t\t\t\t{\n\t\t\t\t\t\t\t\tdivisor = 120;\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}//normal event\n\t\t\t\t\t\telse if(event.detail)\t\t\n\t\t\t\t\t\t{//special event\n\t\t\t\t\t\t\trawDelta = -event.detail;\n\t\t\t\t\t\t}//special event\n\t\t\t\t\t\telse\n\t\t\t\t\t\t{//odd event\n\t\t\t\t\t\t\t//Unhandled event type (future browser graceful fail)\n\t\t\t\t\t\t\trawDelta = 0;\n\t\t\t\t\t\t\tscaledDelta = 0;\n\t\t\t\t\t\t\t\n\t\t\t\t\t\t\t//alert('Odd Event');\n\t\t\t\t\t\t}//odd event\n\t\t\t\t\t\t\n\t\t\t\t\t\tif(Math.abs(rawDelta) >= divisor)\n\t\t\t\t\t\t{//divide\n\t\t\t\t\t\t\tscaledDelta = rawDelta/divisor;\n\t\t\t\t\t\t}//divide\n\t\t\t\t\t\telse\n\t\t\t\t\t\t{//don't scale\n\t\t\t\t\t\t\tscaledDelta = rawDelta;\n\t\t\t\t\t\t}//don't scale\n\t\t\t\t\t\t\n\t\t\t\t\t\t//Call into the swf to fire a mouse event\n\t\t\t\t\t\tswf.externalMouseEvent(rawDelta, scaledDelta);\n\t\t\t\t\t\t\n\t\t\t\t\t\tif(event.preventDefault)\t\n\t\t\t\t\t\t{//Stop default action\n\t\t\t\t\t\t\tevent.preventDefault();\n\t\t\t\t\t\t}//Stop default action\n\t\t\t\t\t\telse\n\t\t\t\t\t\t{//stop default action (IE)\n\t\t\t\t\t\t\treturn false;\n\t\t\t\t\t\t}//stop default action (IE)\n\t\t\t\t\t\t\t\n\t\t\t\t\t\treturn true;\n\t\t\t\t\t}//MouseWheel\n\n\t\t\t\t\t//set up listeners\n\t\t\t\t\tswf.onmouseover = mws.addScrollListeners;\n\t\t\t\t\tswf.onmouseout = mws.removeScrollListeners;\n\t\t\t\t}//Should Add\n\t\t\t\t\t\n\t\t\t}//InitMouseWheelSupport\n\t\t\t\n\t\t}\n\t]]></script>");

    public $ctor(): void {
        super.$ctor();
    }
}
