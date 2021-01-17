const CP2102 = require('cp2102');
const EventEmitter = require('events');

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
      baudrateBuffer.writeInt32LE(baudRate, 0, 4)
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
  constructor() {
    super();
    this.connection = new CP2102(owlVendorId, cm160DeviceId, opts, setup);
    this.last_valid_month = 0;
    this.connection.on('data', async (frame) => {
      let wordCount = frame.length / wordLength;
      for(let i = 0; i < wordCount; i++) {
        let word = frame.slice(i * wordLength, (i + 1) * wordLength)
        this.processWord(word)
      }
    })
    this.connection.on('ready', () => console.log("connected"))
  }

  processWord(word) {
    if(Buffer.compare(word, frameCodes.ID) == 0) {
      this.connection.write(Buffer.from([0x5a]), (err) => {
        if (err) {
          console.error('Error sending command:', err);
        }
      })
    } else if(Buffer.compare(word, frameCodes.WAIT) == 0) {
      this.connection.write(Buffer.from([0xa5]), (err) => {
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

  decodeWord(word) {
    let data = {
      addr : 0,
      year : word[1]+2000,
      month : word[2],
      day : word[3],
      hour : word[4],
      min : word[5],
      cost : (word[6]+(word[7]<<8))/100.0,
      amps : (word[8]+(word[9]<<8))*0.07,
      isLiveData : (word[0] == frameCodes.LIVE) ? true : false
    }
    data.watts = data.amps * volt 
    data.ah = (data.amps/60).toFixed(2)
    data.wh = (data.watts/60).toFixed(2)
    data.amps = data.amps.toFixed(2)
    data.watts = data.watts.toFixed(0)
    return data
  }
}

module.exports = OwlUSB