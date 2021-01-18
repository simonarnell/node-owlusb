import CP2102 from 'cp2102';
import EventEmitter from 'events';
import { round } from 'mathjs';

const owlVendorId = 0x0fde, 
  cm160DeviceId = 0xca05,
  wordLength = 11,
  baudRate = 250000;

const frameCodes = {
  ID: Buffer.from([0xA9, 0x49, 0x44, 0x54, 0x43, 0x4D, 0x56, 0x30, 0x30, 0x31, 0x01]),
  WAIT: Buffer.from([0xA9, 0x49, 0x44, 0x54, 0x57, 0x41, 0x49, 0x54, 0x50, 0x43, 0x52]),
  LIVE: 0x51,
  DB: 0x59
}

const opts = {
  baudRate,
  transfers : 3,
  wordLength,
  inEndpointAddress : 0x82
};

const setup = [
  {
    transfer : {
      requestType : 'vendor',
      recipient : 'device',
      request : 0x00,
      index : 0x00,
      value : 0x01
    },
    data : undefined
  },
  {
    transfer : {
      requestType : 'vendor',
      recipient : 'device',
      request : 0x1e,
      index : 0x00,
      value : 0x01,
    },
    data : (() => {
      let baudrateBuffer = Buffer.alloc(4);
      baudrateBuffer.writeInt32LE(baudRate)
      return baudrateBuffer
    })()
  },
  {
    transfer : {
      requestType : 'vendor',
      recipient : 'device',
      request : 0x00,
      index : 0x00,
      value : 0x00,
    },
    data : undefined
  }
]

const volt = 230; 

class OwlUSB extends EventEmitter {
  connection: any;
  last_valid_month: number;
  constructor() {
    super();
    this.connection = new CP2102(owlVendorId, cm160DeviceId, opts, setup);
    this.last_valid_month = 0;
    this.connection.on('data', async (frame : Buffer) => {
      let wordCount = frame.length / wordLength;
      for(let i = 0; i < wordCount; i++) {
        let word = frame.slice(i * wordLength, (i + 1) * wordLength)
        this.processWord(word)
      }
    })
    this.connection.on('ready', () => console.log("connected"))
  }

  processWord(word : Buffer) {
    if(Buffer.compare(word, frameCodes.ID) == 0) {
      this.connection.write(Buffer.from([0x5a]), (err: any) => {
        if (err) {
          console.error('Error sending command:', err);
        }
      })
    } else if(Buffer.compare(word, frameCodes.WAIT) == 0) {
      this.connection.write(Buffer.from([0xa5]), (err: any) => {
        if (err) {
          console.error('Error sending command:', err);
        }
      })
    } else {
      if(word[0] != frameCodes.LIVE && word[0] != frameCodes.DB) {
        console.error(`Word error: invalid ID ${word[0]}`);
        for(let i = 0; i < 11; i++)
          console.debug(`byte ${i} - ${word[i]} `)
        return -1;
      }
      let checksum = 0;
      for(let i = 0; i < 10; i++) {
        checksum += word[i]
      }
      checksum &= 0xff;
      if(checksum != word[10])
      {
        console.warn(`Word error: invalid checksum: expected ${word[10]}, got ${checksum}`);
        return -1;
      } else {
        let data = this.decodeWord(word)
        if(data.month < 0 || data.month > 12)
          data.month = this.last_valid_month;
        else
          this.last_valid_month = data.month;
        if(data.isLiveData) {
          console.info('live data received')
          this.emit('live', data);
        } else {
          console.info('db record received')
          this.emit('db', data)
        }
      }
    }
  }

  decodeWord(word : Buffer) : Record {
    let addr: number = 0,
      year: number = word[1]+2000,
      month: number = word[2],
      day: number = word[3],
      hour: number = word[4],
      min: number = word[5],
      cost: number = round((word[6]+(word[7]<<8))/100.0,2),
      amps: number = (word[8]+(word[9]<<8))*0.07,
      watts: number = amps * volt,
      ah: number = amps/60,
      wh: number = watts/60,
      isLiveData: boolean = (word[0] == frameCodes.LIVE) ? true : false
    return {
      addr, 
      year, 
      month, 
      day, 
      hour, 
      min, 
      cost, 
      amps: round(amps, 3), 
      watts: round(watts), 
      ah: round(ah, 2), 
      wh: round(wh, 2),
      isLiveData
    }
  }
}

type Record = {
  addr: number,
  year: number,
  month: number,
  day: number,
  hour: number,
  min: number,
  cost: number,
  amps: number,
  watts: number,
  ah: number,
  wh: number,
  isLiveData: boolean
}

module.exports = OwlUSB