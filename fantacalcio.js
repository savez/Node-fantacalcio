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

            // Giocatori
            /*
            <ul class="team-players">
          <li><span class="team-player">MIRANTE</span><span class="numero"><span>83</span></span></li>
	<li><span class="team-player">MBAYE</span><span class="numero"><span>15</span></span></li>
	<li><span class="team-player">GONZALEZ</span><span class="numero"><span>3</span></span></li>
	<li><span class="team-player">HELANDER</span><span class="numero"><span>18</span></span></li>
	<li><span class="team-player">MASINA</span><span class="numero"><span>25</span></span></li>
	<li><span class="team-player">DONSAH</span><span class="numero"><span>77</span></span></li>
	<li><span class="team-player">PULGAR</span><span class="numero"><span>5</span></span></li>
	<li><span class="team-player">TAIDER</span><span class="numero"><span>8</span></span></li>
	<li><span class="team-player">VERDI</span><span class="numero"><span>9</span></span></li>
	<li><span class="team-player">PALACIO</span><span class="numero"><span>24</span></span></li>
	<li><span class="team-player">DI FRANCESCO</span><span class="numero"><span>14</span></span></li>

        </ul>
             */
            let giocatori = null;
            if(index2 <= 0)
                giocatori = $('div.'+element+' div.matchFieldInner ul.team-players-container li').first().html();
            else
                giocatori = $('div.'+element+' div.matchFieldInner ul.team-players-container li').last().html();

            const $giocatori = cheerio.load(giocatori);
            let fooCalciatori = [];
            $giocatori('span.team-player').filter(function(k,v){
                fooCalciatori.push($(this).text());
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
