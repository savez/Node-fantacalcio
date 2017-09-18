var cheerio = require('cheerio');
var http = require('http');
var async = require('async');

function buildObjSquadra(){
    return {
        nome: null,
        giocatori: [],
        logo: null,
        modulo: null,
        allenatore: null
    };
};

function buildObjFormazioni(){
    return {
        home: null,
        away: null,
        update: null,
        partita: null
    };
};

function getData(options,cb){
    async.waterfall(
        [
            (callback) => {
                response = http.get(options, (response) => {
                    let rawData = '';
                    response.setEncoding('utf8');
                    response.on('data', (chunk) => { rawData += chunk; });
                    response.on('end', () => { callback(null,rawData); });
                })
                    .on('error', (e) => {
                        console.error(e.message);
                    });
            },

            (rawData,callback) => {
                callback(null,buildObj(rawData));
            }
        ],cb);
}

function buildObj(html){
    let formazioni = [];
    const listClass = ['home','away'];  // Nomi delle classi che identificano squadra in casa e squadra ospite
    const $ = cheerio.load(html);
    $('.matchFieldContainer').each((index,val) => {
        formazioni[index] = buildObjFormazioni();
        let classi = val.attribs.class;
        let element = classi.substring(20);
        formazioni[index].update = $('div.'+element+' span.lastUpdate').text();
        formazioni[index].partita = $('div.'+element+' div.matchFieldInner div.matchDateTime').text();
        listClass.forEach((elem,index2) => {
            foo = buildObjSquadra();
            foo.allenatore = $('div.'+element+' div.matchFieldInner div.'+elem+'Module span.mister').text();
            foo.nome = $('div.'+element+' div.'+elem+'Team span.teamName a').text();
            foo.modulo = $('div.'+element+' div.matchFieldInner div.'+elem+'Module span.modulo').text();

            // @Todo: Giocatori
            let giocatori = null;
            if(index2 <= 0)
                giocatori = $('div.'+element+' div.matchFieldInner ul.team-players-container li').first().html();
            else
                giocatori = $('div.'+element+' div.matchFieldInner ul.team-players-container li').last().html();

            const $giocatori = cheerio.load(giocatori);
            foo.giocatori = $giocatori('.team-players').html();
            formazioni[index][elem] = foo;
        });
    });
    return formazioni;
}

// Esponi servizio
module.exports.getData = (options,cb) => {
    return new getData(options,cb);
}
