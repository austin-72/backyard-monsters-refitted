import { ASObject } from "as3";

/**
 * 	Class that contains static utility methods for manipulating Strings.
 *
 * 	@langversion ActionScript 3.0
 *	@playerversion Flash 9.0
 *	@tiptext
 */
export class StringUtil extends ASObject {

    /**
     *	Does a case insensitive compare or two strings and returns true if
     *	they are equal.
     *
     *	@param s1 The first string to compare.
     *
     *	@param s2 The second string to compare.
     *
     *	@returns A boolean value indicating whether the strings' values are
     *	equal in a case sensitive compare.
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static stringsAreEqual(s1: string, s2: string, caseSensitive: boolean): boolean {
        if (caseSensitive) {
            return (s1 == s2);
        } else {
            return (s1.toUpperCase() == s2.toUpperCase());
        }
    }

    /**
     *	Removes whitespace from the front and the end of the specified
     *	string.
     *
     *	@param input The String whose beginning and ending whitespace will
     *	will be removed.
     *
     *	@returns A String with whitespace removed from the begining and end
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static trim(input: string): string {
        return StringUtil.ltrim(StringUtil.rtrim(input));
    }

    /**
     *	Removes whitespace from the front of the specified string.
     *
     *	@param input The String whose beginning whitespace will will be removed.
     *
     *	@returns A String with whitespace removed from the begining
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static ltrim(input: string): string {
        let size: number = input.length;
        for (let i: number = 0; i < size; i++) {
            if (input.charCodeAt(i) > 32) {
                return input.substring(i);
            }
        }
        return "";
    }

    /**
     *	Removes whitespace from the end of the specified string.
     *
     *	@param input The String whose ending whitespace will will be removed.
     *
     *	@returns A String with whitespace removed from the end
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static rtrim(input: string): string {
        let size: number = input.length;
        for (let i: number = size; i > 0; i--) {
            if (input.charCodeAt(i - 1) > 32) {
                return input.substring(0, i);
            }
        }

        return "";
    }

    /**
     *	Determines whether the specified string begins with the spcified prefix.
     *
     *	@param input The string that the prefix will be checked against.
     *
     *	@param prefix The prefix that will be tested against the string.
     *
     *	@returns True if the string starts with the prefix, false if it does not.
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static beginsWith(input: string, prefix: string): boolean {
        return (prefix == input.substring(0, prefix.length));
    }

    /**
     *	Determines whether the specified string ends with the spcified suffix.
     *
     *	@param input The string that the suffic will be checked against.
     *
     *	@param prefix The suffic that will be tested against the string.
     *
     *	@returns True if the string ends with the suffix, false if it does not.
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static endsWith(input: string, suffix: string): boolean {
        return (suffix == input.substring(input.length - suffix.length));
    }

    /**
     *	Removes all instances of the remove string in the input string.
     *
     *	@param input The string that will be checked for instances of remove
     *	string
     *
     *	@param remove The string that will be removed from the input string.
     *
     *	@returns A String with the remove string removed.
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static remove(input: string, remove: string): string {
        return StringUtil.replace(input, remove, "");
    }

    /**
     *	Replaces all instances of the replace string in the input string
     *	with the replaceWith string.
     *
     *	@param input The string that instances of replace string will be
     *	replaces with removeWith string.
     *
     *	@param replace The string that will be replaced by instances of
     *	the replaceWith string.
     *
     *	@param replaceWith The string that will replace instances of replace
     *	string.
     *
     *	@returns A new String with the replace string replaced with the
     *	replaceWith string.
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static replace(input: string, replace: string, replaceWith: string): string {
        return input.split(replace).join(replaceWith);
    }

    /**
     *	Specifies whether the specified string is either non-null, or contains
     *  	characters (i.e. length is greater that 0)
     *
     *	@param s The string which is being checked for a value
     *
     * 	@langversion ActionScript 3.0
     *	@playerversion Flash 9.0
     *	@tiptext
     */
    public static stringHasValue(s: string): boolean {
        // todo: this needs a unit test
        return (s != null && s.length > 0);
    }
}
