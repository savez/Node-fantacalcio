var cheerio = require('cheerio');
var http = require('http');
var async = require('async');

// Oggetti per JSON
function buildObjSquadra(){
    return {
        nome: null,
        giocatori: [],
        logo: null,
        modulo: null,
        allenatore: null,
        details: null
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

/**
 * Recupero dati per la formazione
 * @param options
 * @param cb
 */
function getFormazioni(cb){
    async.waterfall(
        [
            // Recupero HTML possibili formazioni
            (callback) => {
                response = http.get({
                    host: 'www.gazzetta.it',
                    port: 80,
                    path:'/Calcio/prob_form/',
                    headers: {
                        'Content-Type': 'text/html'
                    }
                }, (response) => {
                    let rawData = '';
                    response.setEncoding('utf8');
                    response.on('data', (chunk) => { rawData += chunk; });
                    response.on('end', () => { callback(null,rawData); });
                })
                    .on('error', (e) => {
                        console.error(e.message);
                    });
            },
            // Recupero HTML elenco giocatori
            (pg,callback) => {
                let rawData = '';
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
                        callback(null,{pg:pg,rawData:rawData});
                    });
                })
                .on('error', (e) => {
                    console.error(e.message);
                });
            },
            // Costruzione OBj elenco giocatori e passaggio dati per la build del JSON
            (obj,callback) => {
                callback(null,{g:buildElencoGiocatori(obj.rawData),pg:obj.pg});
            },
            // Passo tutti i dati alla callback per la costruzione del JSON
            (rawData,callback) => {
                callback(null,buildObj(rawData));
            }
        ],cb);
}

/**
 * Recupero dati per elenco giocatori
 * @param cb
 * @returns {Array}
 */

function elencoGiocatori(cb){
    async.waterfall(
        [
            // Recupero HTML elenco giocatori
            (callback) => {
                response = http.get({
                    host: 'www.gazzetta.it',
                    port: 80,
                    path:'/calcio/fantanews/statistiche/serie-a-2017-18/',
                    headers: {
                        'Content-Type': 'text/html'
                    }
                }, (response) => {
                    let rawData = '';
                    response.setEncoding('utf8');
                    response.on('data', (chunk) => { rawData += chunk; });
                    response.on('end', () => {
                        callback(null,rawData);
                    });
                })
                .on('error', (e) => {
                    console.error(e.message);
                });
            },
            // Costruzione OBj elenco giocatori e passaggio dati per la build del JSON
            (html,callback) => {
                callback(null,buildElencoGiocatori(html));
            },
        ],cb);
}

/**
 * Funzione per la costruzione dell'oggetto elencoCalciatori
 * @param rawData
 * @returns {Array}
 */
function buildElencoGiocatori(rawData){
    let giocatoriObj = [];
    const $ = cheerio.load(rawData);
    $('table.playerStats tbody tr').each((i,v) => {
        let giocatore = buildDatiG();
        const $item = cheerio.load(v);

        giocatore.nome = $item('td.field-giocatore a').text();
        giocatore.url_detail = $item('td.field-giocatore a').attr('href');
        giocatore.ruolo = $item('td.field-ruolo').text();
        giocatore.media_magic_voto = $item('td.field-mm').text();
        giocatore.media_voto = $item('td.field-mv').text();
        giocatore.squadra = $item('td.field-sqd span.hidden-team-name').text();
        giocatore.assist = $item('td.field-a').text();
        giocatore.ammonizioni = $item('td.field-am').text();
        giocatore.espulsioni = $item('td.field-es').text();
        giocatore.goal = $item('td.field-g').text();
        giocatore.partite_giocate = $item('td.field-pg').text();

        giocatoriObj.push(giocatore);
    });
    return giocatoriObj;
}

/**
 * Funzione per la costruzione dle JSON per la formazione
 * @param html
 * @returns {Array}
 */
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
            let foo = buildObjSquadra();
            foo.allenatore = $('div.'+element+' div.matchFieldInner div.'+elem+'Module span.mister').text();
            foo.nome = $('div.'+element+' div.'+elem+'Team span.teamName a').text();
            foo.modulo = $('div.'+element+' div.matchFieldInner div.'+elem+'Module span.modulo').text();
            foo.details = $('div.'+element+' div.matchDetails div.'+elem+'Details').html();

            let nome_squadra = foo.nome;
            nome_squadra = nome_squadra.toLowerCase();

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
                let ngByFormazione = $item('span.team-player').text().toLowerCase().replace("'",'');
                ngByFormazione = ngByFormazione.trim();
                let datiG = buildDatiG();
                arrayGiocatori.forEach((itemG,i) => {
                    let returnMapping = mappingNomegiocatore(nome_squadra,itemG,ngByFormazione);
                    if(returnMapping !== null)
                        datiG = returnMapping;
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

function mappingNomegiocatore(nome_squadra,itemG,ngByFormazione){
    if(nome_squadra == itemG['squadra'].toLowerCase()){
        if(ngByFormazione.indexOf(' ') != -1){
            // caso: Douglas Costa => Costa D. ; Borja Valero => Valero B. ;  Alex Sandro => Alex Sandro
            let bar = ngByFormazione.toLowerCase().split(' ');
            if(bar[0] == 'de' || bar[0] == 'di'){
                if(itemG['nome'].toLowerCase().indexOf(ngByFormazione.toLowerCase()) != -1 ||
                    ngByFormazione.toLowerCase().indexOf(itemG['nome']) != -1){
                    return itemG;
                }
            }else{
                if(itemG['nome'].toLowerCase().indexOf(bar[0]) != -1 ||
                    itemG['nome'].toLowerCase().indexOf(bar[1]) != -1){
                    console.log('ng_formazione: '+ngByFormazione+ ' - itemG: '+itemG['nome']+ ' INSERITO 1');
                    return itemG;
                }
            }
        }else{
            // caso: Icardi ; Costa => Costa A.
            if(itemG['nome'].toLowerCase().indexOf(ngByFormazione.toLowerCase()) != -1 ||
                ngByFormazione.toLowerCase().indexOf(itemG['nome']) != -1){
                return itemG;
            }
        }
    }
    return null;
}

/**
 * Funzione per recupero risultati delle varie giornate
 * @param cb
 * @returns {Array}
 */
function getRisultatiGiornate(cb){
    // http://www.gazzetta.it/speciali/risultati_classifiche/2018/calcio/seriea/calendario.shtml?data=7a_giornata_20170930


}

// Esponi servizio
module.exports.getData = (cb) => {
    return new getFormazioni(cb);
}

module.exports.getGiocatori = (cb) => {
    return new elencoGiocatori(cb);
}

module.exports.getRisultatiGiornate = (cb) => {
    return new getRisultatiGiornate(cb);
}



