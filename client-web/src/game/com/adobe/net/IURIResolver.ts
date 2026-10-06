import * as as3 from "as3";
import { URI } from "@game";

/**
 * The URI class cannot know about DNS aliases, virtual hosts, or
 * symbolic links that may be involved.  The application can provide
 * an implementation of this interface to resolve the URI before the
 * URI class makes any comparisons.  For example, a web host has
 * two aliases:
 *
 * <p><code>
 *    http://www.site.com/
 *    http://www.site.net/
 * </code></p>
 *
 * <p>The application can provide an implementation that automatically
 * resolves site.net to site.com before URI compares two URI objects.
 * Only the application can know and understand the context in which
 * the URI's are being used.</p>
 *
 * <p>Use the URI.resolver accessor to assign a custom resolver to
 * the URI class.  Any resolver specified is global to all instances
 * of URI.</p>
 *
 * <p>URI will call this before performing URI comparisons in the
 * URI.getRelation() and URI.getCommonParent() functions.</p>
 *
 * @see URI.getRelation
 * @see URI.getCommonParent
 *
 * @langversion ActionScript 3.0
 * @playerversion Flash 9.0
 */
export interface IURIResolver {
    /**
     * Implement this method to provide custom URI resolution for
     * your application.
     *
     * @langversion ActionScript 3.0
     * @playerversion Flash 9.0
     */
    resolve(uri: URI): URI;
}
export const IURIResolver = as3.iface("com.adobe.net::IURIResolver", []);
