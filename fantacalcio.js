var cheerio = require('cheerio');
var http = require('https');
var async = require('async');
var stringSimilarity = require('string-similarity');


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
function buildObjGiornata(){
    return{
        numero: null,
        data: null,
        ora: null,
        risultato:[]
    }
}

class RisGiornata{
    costructor(data,ora,sq1,sq2,r1,r2){
        this.data = data;
        this.ora = ora;
        this.risultato = [
            sq1 => r1,
            sq2 => r2
        ];
    }
    toString(){
        return ;
    }
}

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
                    port: 443,
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
                    port: 443,
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
                    port: 443,
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

    let giocatoriArray = new Array();
    arrayGiocatori.forEach((itemG,i) => {
        // Correggo nome del verona
        let fooNomeSq = itemG['squadra'];
        if(fooNomeSq.indexOf('verona') != -1){
            fooNomeSq = 'verona';
        }
        if(giocatoriArray.hasOwnProperty(fooNomeSq)){
            giocatoriArray[fooNomeSq].push(itemG['nome']);
        }else{
            giocatoriArray[fooNomeSq] = [];
            giocatoriArray[fooNomeSq].push(itemG['nome']);
        }
    });

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
                let boolNGMapping = false;


                // Controllo similarità per cercare di mappare i nomi giocatori
                var similarity = stringSimilarity.findBestMatch(ngByFormazione,giocatoriArray[nome_squadra]);
                arrayGiocatori.forEach((item,i) => {
                    if(similarity.bestMatch.target == item['nome']){
                        datiG = item;
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

/**
 * Funzione per recupero risultati delle varie giornate
 * @param cb
 * @returns {Array}
 */
function getRisultatiGiornate(cb){
    // http://www.gazzetta.it/speciali/risultati_classifiche/2018/calcio/seriea
    /**
     * 1- recupero menu per link alle varie pagine
     * 2- richiamo le varie pagine a ciclo e recupero i vari dati
     * 3- strutturo json di ritorno
     */
    async.waterfall(
        [
            // Recupero HTML possibili formazioni
            (callback) => {
                // Recupero lista menu per successive iterazioni
                response = http.get({
                    host: 'www.gazzetta.it',
                    port: 443,
                    path:'/speciali/risultati_classifiche/2018/calcio/seriea/',
                    headers: {
                        'Content-Type': 'text/html'
                    }
                },(response) => {
                    let rawData = '';
                    response.setEncoding('utf8');
                    response.on('data', (chunk) => { rawData += chunk; });
                    response.on('end', () => { callback(null,rawData); });
                })
                .on('error', (e) => {
                    console.error(e.message);
                });
            },
            // Creo array menu
            (dpg,callback) => {
                var menu = [];
                const $ = cheerio.load(dpg);
                $('ul#calendar_list li').filter((i,v) => {
                    const $item = cheerio.load(v);
                    menu.push($item('a').attr('rel'));
                });
                callback(null,menu);
            },
            // Itero menu per recuperare tabella risultati e creare oggetto
            (menu,callback) => {
                giornateArray = new Array();

                // Creo funzioni anoniime con le varie chiamate da fare.
                var calls = [];
                menu.forEach((item,i) => {
                    calls.push(function(cb) {
                        var itemRisultato = {};
                        response = http.get({
                            host: 'www.gazzetta.it',
                            port: 443,
                            path:'/speciali/risultati_classifiche/2018/calcio/seriea/calendario.shtml?data='+item,
                            headers: {'Content-Type': 'text/html'}
                        }, (response) => {
                            let rawData = '';
                            response.setEncoding('utf8');
                            response.on('data', (chunk) => { rawData += chunk; });
                            response.on('end', () => {
                                let foo = buildGiornata(rawData);
                                giornateArray.push(foo.ris);
                                cb();
                            });
                        })
                        .on('error', (e) => {
                            console.error(e.message);
                        });
                    });
                });
                async.parallel(calls,(err,results) => {
                    callback(null,giornateArray);
                });
            }
        ],cb);
}

/**
 * Funzione che costruisce la giornata (array di risultati)
 * @returns {Array}
 */
function buildGiornata(rawData){
    let giornata = new Array();
    const $ = cheerio.load(rawData);
    var numeroGiornata = $('div#block_serie_a h2 strong.range_phase').text();
    $('div.CalendarBlock table.results tbody tr').filter((i,v) => {
        const $item = cheerio.load(v);
        var risultato = new buildObjGiornata();
        risultato.data = $item('td.col1 span.date').text();
        risultato.ora = $item('td.col2 span.time').text();
        risultato.numero = numeroGiornata.replace(/\D/g,'');
        var match = $item('td.col5 a').text();
        var match_array = match.split('-');
        match_array.forEach((elem,i) => {
            var col = [3,7];
            risultato.risultato.push({
                nome: $item('td.col'+col[i]+' a').text().replace('\n',''),
                goal: elem,
            });
        });
        giornata.push(risultato);
    });
    return {
        ris: giornata,
        numero: numeroGiornata.replace(/\D/g,'')
    };
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



