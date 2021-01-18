declare module "cp2102" {

    import EventEmitter from "events";

    class CP2012 extends EventEmitter {
        constructor(owlVendorId: number, cm160DeviceId: number, opts: options, setup: setupParameter[]);
        write(data: Buffer, cb: (err) => unknown) : void
    }

    type options = {
        baudRate: number,
        transfers: number,
        wordLength: number,
        inEndpointAddress: number
    }

    type setupParameter = {
        transfer: {
            requestType: string,
            recipient: string,
            request: number,
            index: number,
            value: number,
        },
        data: Buffer
    }
    export = CP2012;
}