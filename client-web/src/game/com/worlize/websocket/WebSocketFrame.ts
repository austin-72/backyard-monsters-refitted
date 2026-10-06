import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { ByteArray, Endian, IDataInput, IDataOutput } from "flash/utils";
import { WebSocketConfig, WebSocketOpcode } from "@game";

export class WebSocketFrame extends ASObject {
    static {
        as3.fields(this, { fin: false, rsv1: false, rsv2: false, rsv3: false, opcode: 0, mask: false, useNullMask: false, _length: 0, binaryPayload: null, closeStatus: 0, protocolError: false, frameTooLarge: false, dropReason: null, parseState: 0 });
    }

    private static readonly NEW_FRAME: int = 0;
    private static readonly WAITING_FOR_16_BIT_LENGTH: int = 1;
    private static readonly WAITING_FOR_64_BIT_LENGTH: int = 2;
    private static readonly WAITING_FOR_PAYLOAD: int = 3;
    private static readonly COMPLETE: int = 4;

    // Initialize as NEW_FRAME
    private static _tempMaskBytes: Vector<uint> = new Vector<uint>(4, false, uint);
    public fin: boolean;
    public rsv1: boolean;
    public rsv2: boolean;
    public rsv3: boolean;
    public opcode: int;
    public mask: boolean;
    public useNullMask: boolean;
    private _length: int;
    public binaryPayload: ByteArray;
    public closeStatus: int;
    public protocolError: boolean;
    public frameTooLarge: boolean;
    public dropReason: string;
    private parseState: int;


    public get length(): int {
        return this._length;
    }

    // Returns true if frame is complete, false if waiting for more data
    public addData(input: IDataInput, fragmentationType: int, config: WebSocketConfig): boolean {
        if (input.bytesAvailable >= 2) {
            // minimum frame size
            if (this.parseState === WebSocketFrame.NEW_FRAME) {
                let firstByte: int = input.readByte();
                let secondByte: int = input.readByte();

                this.fin = Boolean(firstByte & 0x80);
                this.rsv1 = Boolean(firstByte & 0x40);
                this.rsv2 = Boolean(firstByte & 0x20);
                this.rsv3 = Boolean(firstByte & 0x10);
                this.mask = Boolean(secondByte & 0x80);
                this.opcode = firstByte & 0x0F;
                this._length = secondByte & 0x7F;

                if (this.mask) {
                    this.protocolError = true;
                    this.dropReason = "Received an illegal masked frame from the server.";
                    return true;
                }

                if (this.opcode > 0x07) {
                    if (this._length > 125) {
                        this.protocolError = true;
                        this.dropReason = "Illegal control frame larger than 125 bytes.";
                        return true;
                    }
                    if (!this.fin) {
                        this.protocolError = true;
                        this.dropReason = "Received illegal fragmented control message.";
                        return true;
                    }
                }

                if (this._length === 126) {
                    this.parseState = WebSocketFrame.WAITING_FOR_16_BIT_LENGTH;
                } else if (this._length === 127) {
                    this.parseState = WebSocketFrame.WAITING_FOR_64_BIT_LENGTH;
                } else {
                    this.parseState = WebSocketFrame.WAITING_FOR_PAYLOAD;
                }
            }
            if (this.parseState === WebSocketFrame.WAITING_FOR_16_BIT_LENGTH) {
                if (input.bytesAvailable >= 2) {
                    this._length = input.readUnsignedShort();
                    this.parseState = WebSocketFrame.WAITING_FOR_PAYLOAD;
                }
            } else if (this.parseState === WebSocketFrame.WAITING_FOR_64_BIT_LENGTH) {
                if (input.bytesAvailable >= 8) {
                    // We can't deal with 64-bit integers in Flash..
                    // So we'll just throw away the most significant
                    // 32 bits and hope for the best.
                    let firstHalf: uint = input.readUnsignedInt();
                    if (firstHalf > 0) {
                        this.frameTooLarge = true;
                        this.dropReason = "Unsupported 64-bit length frame received.";
                        return true;
                    }
                    this._length = input.readUnsignedInt();
                    this.parseState = WebSocketFrame.WAITING_FOR_PAYLOAD;
                }
            }
            if (this.parseState === WebSocketFrame.WAITING_FOR_PAYLOAD) {
                if (this._length > config.maxReceivedFrameSize) {
                    this.frameTooLarge = true;
                    this.dropReason = "Received frame size of " + this._length + "exceeds maximum accepted frame size of " + config.maxReceivedFrameSize;
                    return true;
                } else {
                    if (this._length === 0) {
                        this.binaryPayload = new ByteArray();
                        this.parseState = WebSocketFrame.COMPLETE;
                        return true;
                    }
                    if (input.bytesAvailable >= this._length) {
                        this.binaryPayload = new ByteArray();
                        this.binaryPayload.endian = Endian.BIG_ENDIAN;
                        input.readBytes(this.binaryPayload, 0, this._length >>> 0);
                        this.binaryPayload.position = 0;
                        this.parseState = WebSocketFrame.COMPLETE;
                        return true;
                    }
                }
            }
        }
        // If more data is needed but not available on the socket yet,
        // return false.  If there is enough data and the frame parsing
        // has been completed, return true.
        return false;
    }

    private throwAwayPayload(input: IDataInput): void {
        if (input.bytesAvailable >= this._length) {
            for (let i: int = 0; i < this._length; i++) {
                input.readByte();
            }
            this.parseState = WebSocketFrame.COMPLETE;
        }
    }

    public send(output: IDataOutput): void {
        let maskKey: uint = 0;
        if (this.mask && !this.useNullMask) {
            // Generate a mask key
            maskKey = Math.ceil(Math.random() * 0xFFFFFFFF) >>> 0;
            as3.vset(WebSocketFrame._tempMaskBytes, 0, ((maskKey >> 24) & 0xFF) >>> 0);
            as3.vset(WebSocketFrame._tempMaskBytes, 1, ((maskKey >> 16) & 0xFF) >>> 0);
            as3.vset(WebSocketFrame._tempMaskBytes, 2, ((maskKey >> 8) & 0xFF) >>> 0);
            as3.vset(WebSocketFrame._tempMaskBytes, 3, (maskKey & 0xFF) >>> 0);
        }

        let data: ByteArray = null;

        let firstByte: int = 0x00;
        let secondByte: int = 0x00;
        if (this.fin) {
            firstByte |= 0x80;
        }
        if (this.rsv1) {
            firstByte |= 0x40;
        }
        if (this.rsv2) {
            firstByte |= 0x20;
        }
        if (this.rsv3) {
            firstByte |= 0x10;
        }
        if (this.mask) {
            secondByte |= 0x80;
        }

        firstByte |= (this.opcode & 0x0F);

        if (this.opcode === WebSocketOpcode.CONNECTION_CLOSE) {
            data = new ByteArray();
            data.endian = Endian.BIG_ENDIAN;
            data.writeShort(this.closeStatus);
            if (this.binaryPayload) {
                this.binaryPayload.position = 0;
                data.writeBytes(this.binaryPayload);
            }
            data.position = 0;
            this._length = data.length;
        } else if (this.binaryPayload) {
            data = this.binaryPayload;
            data.endian = Endian.BIG_ENDIAN;
            data.position = 0;
            this._length = data.length;
        } else {
            data = new ByteArray();
            this._length = 0;
        }

        if (this.opcode >= 0x08) {
            if (this._length > 125) {
                throw new Error("Illegal control frame longer than 125 bytes");
            }
            if (!this.fin) {
                throw new Error("Control frames must not be fragmented.");
            }
        }

        if (this._length <= 125) {
            // encode the length directly into the two-byte frame header
            secondByte |= (this._length & 0x7F);
        } else if (this._length > 125 && this._length <= 0xFFFF) {
            // Use 16-bit length
            secondByte |= 126;
        } else if (this._length > 0xFFFF) {
            // Use 64-bit length
            secondByte |= 127;
        }

        // output the frame header
        output.writeByte(firstByte);
        output.writeByte(secondByte);

        if (this._length > 125 && this._length <= 0xFFFF) {
            // write 16-bit length
            output.writeShort(this._length);
        } else if (this._length > 0xFFFF) {
            // write 64-bit length
            output.writeUnsignedInt(0);
            output.writeUnsignedInt(this._length >>> 0);
        }

        if (this.mask) {
            if (this.useNullMask) {
                output.writeUnsignedInt(0);
                output.writeBytes(data, 0, data.length);
            } else {
                // write the mask key to the output
                output.writeUnsignedInt(maskKey);

                // Mask and send the payload
                let j: int = 0;

                let remaining: uint = data.bytesAvailable;
                while (remaining >= 4) {
                    output.writeUnsignedInt((data.readUnsignedInt() ^ maskKey) >>> 0);
                    remaining = (remaining - 4) >>> 0;
                }
                while (remaining > 0) {
                    output.writeByte(data.readByte() ^ as3.vget(WebSocketFrame._tempMaskBytes, j));
                    j += 1;
                    remaining = (remaining - 1) >>> 0;
                }
            }
        } else {
            // Send the payload unmasked
            output.writeBytes(data, 0, data.length);
        }
    }
}
