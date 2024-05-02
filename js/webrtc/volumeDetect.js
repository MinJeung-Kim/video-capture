VolumeDetect = function(configuration) {
    if (typeof configuration === 'object') {
        this.soundmeters = {};
        this.configuration = configuration;
    } else {
        throw "VolumeDetect:VolumeDetect(): bad arguments"
    }
};

VolumeDetect.prototype.start = function(stream, clientid) {
    // Put variables in global scope to make them available to the
    // browser console.
    try {
        var audioContext = new AudioContext();
    } catch (e) {
        console.warn('Web Audio API not supported.');
        return false;
    }
    this.soundmeters[clientid] = new SoundMeter(audioContext);
    this.soundmeters[clientid].connectToSource(stream, function(e) {
        if (e) {
            console.warn('connectToSource of SoundMeter is error: ' +  e);
            return false;
        }
    });
    console.info("volume detect is start for " + clientid);
}

VolumeDetect.prototype.stop = function(clientid) {
    this.soundmeters[clientid].stop();
    delete(this.soundmeters[clientid]);
    console.info("volume detect is stop for " + clientid);
}

VolumeDetect.prototype.getMaxVolumeClient = function() {
    var maxVolume = this.configuration.maxVolume;
    var subVolume = this.configuration.maxVolume;
    var maxClientIdArr = ["없음"];
    for (var soundmeter in this.soundmeters) {
        var volume = this.soundmeters[soundmeter].getVolumeSize();
        // console.info('volume: ' + volume);
        if (maxVolume < volume) {
            subVolume = maxVolume;
            maxVolume = volume;
            maxClientIdArr[0] = soundmeter;
        } else if (subVolume < volume) {
            subVolume = volume;
        }
    }
    return maxClientIdArr;
}

SoundMeter = function(context) {
    this.context = context;
    this.avgVolume = 0.0;
    this.script = context.createScriptProcessor(4096, 1, 1);
    const that = this;
    this.script.onaudioprocess = function(event) {
        const input = event.inputBuffer.getChannelData(0);
        let i;
        let sum = 0.0;
        let clipcount = 0;
        for (i = 0; i < input.length; ++i) {
            sum += Math.abs(input[i]);
            if (Math.abs(input[i]) > 0.99) {
                clipcount += 1;
            }
        }
        this.instant = Math.sqrt(sum / input.length);
        that.avgVolume = 0.95 * that.avgVolume + 0.05 * this.instant;
    };
}

SoundMeter.prototype.getClientId = function() {
    return this.clientid;
}

SoundMeter.prototype.getVolumeSize = function() {
    return this.avgVolume;
}

SoundMeter.prototype.connectToSource = function(stream, callback) {
    try {
        this.mic = this.context.createMediaStreamSource(stream);
        this.mic.connect(this.script);
        // necessary to make sample run, but should not be.
        this.script.connect(this.context.destination);
        if (typeof callback !== 'undefined') {
            callback(null);
        }
    } catch (e) {
        console.error(e);
        if (typeof callback !== 'undefined') {
            callback(e);
        }
    }
}

SoundMeter.prototype.stop = function() {
    this.mic.disconnect();
    this.script.disconnect();
}
