var fs = require('fs');
var tmi = require('tmi.js');
var moment = require('moment');
var requestify = require('requestify');

function chat(configPath) {
    var self = this;
    var songQueue = [];

    self.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    self.options = {
        options: {
            debug: true
        },
        connection: {
            reconnect: true
        },
        identity: self.config.identity,
        channels: [self.config.channel]
    };

    self.client = new tmi.client(self.options);
    self.client.connect();

    self.client.on('message', function (channel, userstate, message, isSelf) {
        if (isSelf) return;

        var songRequestRegex = /^!sr (https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        if (!songRequestRegex.test(message))
            return;

        var youtubeUrl = message.split(' ')[1];
        var videoId = youtubeUrl.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/)[1];

        requestify.get('https://www.googleapis.com/youtube/v3/videos?id=' + videoId + '&key=' + self.config.youtubeApiKey + '&part=contentDetails,snippet').then(function (response) {
            var body = response.getBody();
            var item = body.items[0];
            var name = item.snippet.title;
            var duration = moment.duration(item.contentDetails.duration).asMilliseconds() / 1000;

            var video = {
                url: youtubeUrl,
                videoId: videoId,
                duration: duration,
                name: name,
                username: userstate['display-name'],
                history: false
            };
            songQueue.push(video);
        });
    })

    self.getQueue = function() {
        return songQueue;
    }
}

// export the class
module.exports = chat;