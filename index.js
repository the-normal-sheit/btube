var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var fs = require("fs");
const path = require('path');
var config = JSON.parse(fs.readFileSync("./config.json",{encoding:'utf-8'}));
let catalogue = require('./catalogue');
let whitelist = ["https://files.catbox.moe","./img/"];
let thumbnailforms = [".png",".jpg",".jpeg"];
app.use(express.static("public"));
http.listen(config.port, () => { console.log(`Bonzitube is listening at localhost:${http.address().port}`); });

const blacklist = [
    "<script>",
    "<a href='javascript:",
    '<a href="javascript:',
    "<a",
    "<video>",
    "<img>",
    "<img>",
    "<audio>",
    " onclick='",
    ' onclick="',
    " onmouseover='",
    'onmouseover="',
    "();",
    "function()",
    "function ()",
    "() =>",
    '.innerHTML = "',
    ".innerHTML = ",
];
const Utils = {
    sanitizeString:(str)=>{
        if(typeof str !== "string")str = '';
        str = str.replaceAll('"','\\"');
        str = decodeURIComponent(JSON.parse('"'+str+'"')); //shitty hack for preventing unicode escape
        for(let i=0;i<blacklist.length;i++){
            let satan = blacklist[i];
            if(str.includes(satan))str = str.replaceAll(satan,"");
        }
        return str
    },
    newId:(len)=>{
        let result = "";
        for(let i=0;i<len;i++){
            result+="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(Math.random() * 36));
        }
        return result;
    },
    getJSON:(file)=>{
        return JSON.parse(fs.readFileSync(file,{encoding:'utf-8'}));
    }
};
let mostViewed = [];
function compileMostViewed(){
    let result = [];
    fs.readdir(__dirname+'/user_cont/videos', (err, files) => {
        if(err){
            console.error('Failed to get videos: ', err);
            return;
        }
    
        files.forEach(file => {
            let videoCont = Utils.getJSON("./user_cont/videos/"+file);
            result = [...result,videoCont];
        });
        result.sort((a,b) => b.views-a.views);
        mostViewed = result;
    });
}
function updateVideo(videoName,videoObject){
    fs.readdir(__dirname+'/user_cont/videos',(err,files)=>{
        if(err)console.error(err);
        for(let i=0;i<files.length;i++){
            let fileName = files[i];
            if(fileName == videoName+".json"){
                fs.writeFileSync('./user_cont/videos/'+videoName+'.json',JSON.stringify(videoObject),'utf-8');
            }
        }
    });
}
function updateCatalogue(ip){
    catalogue[ip] = catalogue[ip] == undefined ? [] : catalogue[ip];
    fs.writeFileSync('./catalogue.js',`module.exports = ${JSON.stringify(catalogue)}`,'utf-8');
}
app.get('/video', async (req, res) => {
    if(req.query.id){
        fs.readdir(__dirname+'/user_cont/videos',(err,files)=>{
            if(files.includes('#'+req.query.id+'.json')){
                let thisVideo = Utils.getJSON('./user_cont/videos/#'+req.query.id+'.json');
                res.json(thisVideo);
            }
        });
    }
});
compileMostViewed();
setInterval(() => {compileMostViewed();},30000);
io.on("connection",socket => {
    socket.ip = socket.request.headers['x-forwarded-for'] == undefined ? "127.0.0.1" : socket.request.headers['x-forwarded-for'];
    updateCatalogue(socket.ip);
    socket.on("home",data=>{
        if(data !== undefined && typeof data == "object"){
            socket.emit("home",mostViewed);
        }
    });
    socket.on("goto",data=>{
        if(data !== undefined && typeof data == "string"){
            let result = {};
            data = Utils.sanitizeString(data);
            if(!data.startsWith("#"))return;
            fs.readdir(__dirname+'/user_cont/videos',(err,files)=>{
                if(err){
                    console.error('Failed to get video: ',err);
                    return;
                }
                for(let i=0;i<files.length;i++){
                    let fileName = files[i];
                    if(fileName == data+".json"){
                        result = Utils.getJSON("./user_cont/videos/"+fileName);
                        if(catalogue[socket.ip].includes(result["id"])){

                        } else {
                            result["views"]++;
                            catalogue[socket.ip] = [...catalogue[socket.ip], result["id"]];
                            updateVideo(result["id"],result);
                            updateCatalogue(socket.ip);
                            compileMostViewed();
                        }
                    }
                }
            });
        }
    });
    socket.on("upload",data=>{
        if(typeof data !== "object")return;
        let halt = false;
        Object.keys(data).forEach(parame => {
            if(typeof parame !== "string")halt = true;
        });
        if(halt)return;
        if(data.author == undefined || data.author == "")data.author = "Anonymous Uploader";
        if(data.title == undefined || data.title == "")data.title = "Untitled Video";
        if(data.src == undefined || data.src == "")return;
        if(data.thumbnail == undefined || data.thumbnail == "")data.thumbnail = './img/logo.png';
        if(!whitelist.some(r => {return data.thumbnail.startsWith(r) && data.src.startsWith(r)}))return;
        if(!data.src.endsWith(".mp4") || !thumbnailforms.some(r => data.thumbnail.endsWith(r)))return;
        let localId = Utils.newId(10);
        fs.writeFile('./user_cont/videos/#'+localId+'.json', `
            {
            "title":"${data.title}",
            "views":0,
            "author":"${data.author}",
            "id":"#${localId}",
            "type":"mp4",
            "src":"${data.src}",
            "thumbnail":"${data.thumbnail}"
            }
        `, (err) => {
            if (err) {
                console.error('Error creating file:', err);
            } else {
                console.log('File created successfully!');
            }
        });
        compileMostViewed();
    });
});