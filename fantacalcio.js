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
function buildDatiG(){
    return {
        nome: null,
        squadra: null,
        numero: null,
        ruolo: null,
        media_voto: null,
        media_magic_voto: null,
        url_detail: null,
        goal: null,
        assist: null,
        ammonizioni: null,
        espulsioni: null,
        partite_giocate: null
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
            (pg,callback) => {
                response = http.get({
                    host: 'www.gazzetta.it',
                    port: 80,
                    path:'/calcio/fantanews/statistiche/serie-a-2017-18/',
                    headers: {
                        'Content-Type': 'text/html'
                    }
                }, (response) => {
                    let rawData = '';
                    let giocatoriObj = [];
                    response.setEncoding('utf8');
                    response.on('data', (chunk) => { rawData += chunk; });
                    response.on('end', () => {
                        const $ = cheerio.load(rawData);
                        $('table.playerStats tbody tr').each((i,v) => {
                            let bar = buildDatiG();
                            const $item = cheerio.load(v);

                            bar.nome = $item('td.field-giocatore a').text();
                            bar.url_detail = $item('td.field-giocatore a').attr('href');
                            bar.ruolo = $item('td.field-ruolo').text();
                            bar.media_magic_voto = $item('td.field-mm').text();
                            bar.media_voto = $item('td.field-mv').text();
                            bar.squadra = $item('td.field-sqd span.hidden-team-name').text();
                            bar.assist = $item('td.field-a').text();
                            bar.ammonizioni = $item('td.field-am').text();
                            bar.espulsioni = $item('td.field-es').text();
                            bar.goal = $item('td.field-g').text();
                            bar.partite_giocate = $item('td.field-pg').text();
                            giocatoriObj.push(bar);
                        });
                        callback(null,{g:giocatoriObj,pg:pg})
                    });
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
    const $ = cheerio.load(html.pg);
    let arrayGiocatori = html.g;
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

            // Giocatori
            let giocatori = null;
            if(index2 <= 0)
                giocatori = $('div.'+element+' div.matchFieldInner ul.team-players-container li.team-players-inner').first().html();
            else
                giocatori = $('div.'+element+' div.matchFieldInner ul.team-players-container li.team-players-inner').last().html();

            const $giocatori = cheerio.load(giocatori);
            let fooCalciatori = [];
            $giocatori('ul.team-players li').filter((k,v) => {
                const $item = cheerio.load(v);
                nomeG = $item('span.team-player').text();
                datiG = buildDatiG();
                arrayGiocatori.forEach((v,i) => {
                    let foo = v.nome;
                    foo = foo.toLowerCase();
                    if(foo.indexOf(nomeG.toLowerCase()) != -1){
                        datiG = v;
                    }
                });
                // Popolo oggetto
                datiG.numero = $item('span.numero').text();
                fooCalciatori.push(datiG);
            });
            foo.giocatori = fooCalciatori;
            formazioni[index][elem] = foo;
        });
    });
    return formazioni;
}

// Esponi servizio
module.exports.getData = (options,cb) => {
    return new getData(options,cb);
}




