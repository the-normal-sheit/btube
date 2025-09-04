var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var fs = require("fs");
const path = require('path');
let bans = require('./bans');
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
    "/>",
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
const adminPass = "biaclvb69!@";
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
        let newJSON = undefined;
        try {

            let e = fs.readFileSync(file,{encoding:'utf-8'});
            newJSON = JSON.parse(e);} catch(e){newJSON = undefined;}
        return newJSON;
    },
    averageSet:(array)=>{
        let result = 0;
        let tick = 0;
        array.forEach(value=>{result+=value;tick++;});
        result = result/tick;
        return result;
    }
};
let mostViewed = [];
let globalChat = ``;
let maxDate = 0;
function compileMostViewed(){
    let result = [];
    fs.readdir(__dirname+'/user_cont/videos', (err, files) => {
        if(err){
            console.error('Failed to get videos: ', err);
            return;
        }
    
        files.forEach(file => {
            console.log(file);
            let videoCont = Utils.getJSON("./user_cont/videos/"+file);
            let thisRating = Utils.getJSON("./user_cont/ratings/"+file.replace("#","$"));
            if(thisRating !== undefined){
                let ratings = Object.keys(thisRating);
                let r = [];
                ratings.forEach(ip => {
                    r = [...r,thisRating[ip]];
                });
                thisRating = r;
                let sum = 0;
                thisRating.forEach(rate => {sum+=rate;});
                thisRating = Math.min(Math.round(sum / thisRating.length),5);
            } else {
                thisRating = 0;
            }
            videoCont["stars"] = thisRating;
            if(videoCont["creator"] !== undefined)delete videoCont["creator"];
            result = [...result,videoCont];
        });
        result.sort((a,b) => b.views-a.views);
        mostViewed = result;
        let e = mostViewed.toSorted((a,b)=>b.date-a.date);
        maxDate = e[0]["date"];
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
    catalogue.ips[ip] = catalogue.ips[ip] == undefined ? [] : catalogue.ips[ip];
    fs.writeFileSync('./catalogue.js',`module.exports = {titles:${JSON.stringify(catalogue.titles)},ips:${JSON.stringify(catalogue.ips)}}`,'utf-8');
}
app.get('/video', async (req, res) => {
    try{
  let acceptHeader = req.get('Accept') || '';
  let userAgent = req.get('User-Agent') || '';
  
  let isDiscord = userAgent.includes('Discordbot');
  
  if (acceptHeader.includes('text/html') || isDiscord) {
    if(req.query.id){

      if(isDiscord) {
        fs.readdir(__dirname+'/user_cont/videos',(err,files)=>{
          if(err) {
            return res.redirect('./?video='+req.query.id);
          }
          
          if(files.includes('#'+req.query.id+'.json')){
            let thisVideo = Utils.getJSON('./user_cont/videos/#'+req.query.id+'.json');
            
            let embedHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta property="og:title" content="BonziTUBE">
    <meta property="og:description" content="Shared video: ${thisVideo.title || 'Video'}">
    <meta property="og:type" content="video.other">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="BonziTUBE">
    <meta name="twitter:description" content="Shared video: ${thisVideo.title || 'Video'}">
    <meta property="og:image" content="./img/logo.png" />
    <title>BonziTUBE - ${thisVideo.title || 'Video'}</title>
</head>
<body>
    <script>
        window.location.href = './?video=${req.query.id}';
    </script>
</body>
</html>`;
            
            return res.send(embedHTML);
          } else {
            return res.redirect('./?video='+req.query.id);
          }
        });
      } else {
        return res.redirect('./?video='+req.query.id);
      }
    }
  }
  
  if(req.query.id){
    fs.readdir(__dirname+'/user_cont/videos',(err,files)=>{
      if(err) {
        return res.status(500).json({error: 'Server error'});
      }
      
      if(files.includes('#'+req.query.id+'.json')){
        let thisVideo = Utils.getJSON('./user_cont/videos/#'+req.query.id+'.json');
        if(thisVideo["creator"] !== undefined)delete thisVideo["creator"];
        return res.json(thisVideo);
      } else {
        return res.status(404).json({error: 'Video not found'});
      }
    });
  } else {
    return res.status(400).json({error: 'No video ID provided'});
  }
}
catch(e){}
});
let uses = {};
let warnings = {};
function modifyUses(ip,amt){
    if(uses[ip]==undefined)uses[ip]=0;
    uses[ip]+=amt;
}
function modifyWarnings(ip,amt){
    if(warnings[ip]==undefined)warnings[ip]=0;
    warnings[ip]+=amt;
}
function inNeighborhood(ip1, ip2, subnetMask) {
  const parseIp = (ipString) => ipString.split('.').map(Number);
  const parseSubnetMask = (maskString) => maskString.split('.').map(Number);

  const ip1Octets = parseIp(ip1);
  const ip2Octets = parseIp(ip2);
  const maskOctets = parseSubnetMask(subnetMask);

  const networkAddress1 = ip1Octets.map((octet, i) => octet & maskOctets[i]);
  const networkAddress2 = ip2Octets.map((octet, i) => octet & maskOctets[i]);

  return networkAddress1.every((val, i) => val === networkAddress2[i]);
}
compileMostViewed();
setInterval(() => {compileMostViewed();},30000);
console.log(Utils.averageSet([3,4,3,1,1,1,5,3]));
let viewCount = 0;
setTimeout(() => {
mostViewed.forEach(vid => {viewCount+=vid["views"];});
console.log("GLOBAL VIEW COUNT "+viewCount);
},3000);
io.on("connection",socket => {
    socket.ip = socket.request.headers['x-forwarded-for'] == undefined ? "127.0.0.1" : socket.request.headers['x-forwarded-for'];
    if(socket.ip.includes(","))socket.ip = socket.ip.split(",")[0];
    updateCatalogue(socket.ip);
    console.log(socket.ip);
    console.log(bans.some(r => inNeighborhood(socket.ip,r,"255.255.255.0")) + " ("+socket.ip+")")
    if(bans.includes(socket.ip) || bans.some(r => inNeighborhood(socket.ip,r,"255.255.255.0"))){
        socket.emit("err","You are banned from BonziTUBE!");
        socket.disconnect(true);
        return;
    }
    socket.on("home",data=>{
        if(data !== undefined && typeof data == "object"){
            let e = mostViewed.toSorted((a,b)=>b.date-a.date);
            socket.emit("home",{most:mostViewed,new:e});
        }
    });
    socket.on("getIp",data=>{
        if(typeof data !== "object")return;
        if(data.id == undefined)return;
        if(data.password == undefined)return;
        if(typeof data.id !== "string")return;
        if(typeof data.password !== "string")return;

        let videoContent = Utils.getJSON('./user_cont/videos/'+data.id+'.json');

        if(videoContent == undefined)return;
        if(videoContent["creator"] == undefined)return;
        
        if(data.password == adminPass){
            socket.emit("getIp",videoContent["creator"]);
        }
    });
    socket.on("banUsar",data=>{
        if(typeof data !== "object")return;
        if(data.id == undefined)return;
        if(data.password == undefined)return;
        if(typeof data.id !== "string")return;
        if(typeof data.password !== "string")return;
        if(data.password !== adminPass)return;
         
            bans = [...bans,data.ip]; 
            fs.writeFileSync('./bans.js',JSON.stringify(bans),'utf-8');
            console.log("Ban success!")
    });
    socket.on("delete",data=>{
        if(typeof data !== "object")return;
        if(data.id == undefined)return;
        if(data.password == undefined)return;
        if(typeof data.id !== "string")return;
        if(typeof data.password !== "string")return;

        if(data.password == adminPass){
            fs.unlink('./user_cont/videos/'+data.id+'.json', (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                return;
                }
            console.log('File deleted successfully!');
            });
            socket.emit("err","Video deleted successfully. It may take time to disappear");
            let e = mostViewed.toSorted((a,b)=>b.date-a.date);
            socket.emit("home",{most:mostViewed,new:e});
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
                        if(catalogue.ips[socket.ip].includes(result["id"])){

                        } else {
                            result["views"]++;
                            catalogue.ips[socket.ip] = [...catalogue.ips[socket.ip], result["id"]];
                            updateVideo(result["id"],result);
                            updateCatalogue(socket.ip);
                            compileMostViewed();
                        }
                    }
                }
            });
        }
    });
    socket.on("ratings",data=>{
        if(typeof data !== "object")return;
        if(typeof data.id !== "string")return;
        if(typeof data.value !== "number" || data.value > 5)return;
        if(typeof data.type !== "string")return;
        if(!data.id.startsWith("#"))return;

        let video = Utils.getJSON('./user_cont/videos/'+data.id+".json");

        if(video == undefined)return;
        fs.readdir(__dirname+'./user_cont/ratings/',(files,err)=>{
            let filename = '$'+data.id+'.json';
            if(files.includes(filename)){
                let currentRating = Utils.getJSON('./user_cont/ratings/'+filename);
                if(Object.keys(currentRating).includes(socket.ip) && currentRating[socket.ip] === data.value){}
                else {
                currentRating[socket.ip] = Math.floor(data.value);
                fs.writeFile('./user_cont/ratings/'+filename,JSON.stringify(currentRating),(err)=>{
                    
                });}
            }
        });
    });
    socket.on("upload",data=>{
        modifyUses(socket.ip,1);
        setTimeout(() => {modifyUses(socket.ip,-1);},config.rateLimit*uses[socket.ip]);
        if(uses[socket.ip] > 3){
            modifyWarnings(socket.ip,1);
            setTimeout(() => {modifyWarnings(socket.ip,-1);},config.rateLimit*warnings[socket.ip]);
            if(warnings[socket.ip] > 3){socket.disconnect(true);}
            socket.emit("err","You have uploaded too much recently. Please wait a while.")
            return;}
        console.log(data)
        if(typeof data !== "object")return;

        let halt = false;
        Object.keys(data).forEach(parame => {
            if(typeof parame !== "string")halt = true;
        });
        
        if(halt){
            console.log("halted");
            socket.emit("err","You used the wrong data types");
            return;
        }
        if(data.author == undefined || data.author == "")data.author = "Anonymous Uploader";
        console.log(data.author == undefined || data.author == "");
        console.log(data.title == undefined || data.title == "");
        
        console.log(data.src == undefined || data.src == "");
        console.log(!whitelist.some(r => data.thumbnail.startsWith(r) && data.src.startsWith(r)));
        //
        if(data.title == undefined || data.title == "")data.title = "Untitled Video";
        console.log(data.src == undefined || data.src == "")
        if(data.src == undefined || data.src == ""){
            socket.emit("err","Dont leave the video URL blank!");
            return;
        }
        if(data.thumbnail == undefined || data.thumbnail == "")data.thumbnail = './img/logo.png';
        console.log(!whitelist.some(r => data.thumbnail.startsWith(r) && data.src.startsWith(r)));
        if(!whitelist.some(r => data.thumbnail.startsWith(r) && data.src.startsWith(r))){
            socket.emit("err","Please use a catbox.moe URL.");
            return;
        }
        if(!data.src.endsWith(".mp4") || !thumbnailforms.some(r => data.thumbnail.endsWith(r)))return;
        //
        console.log((!data.src.endsWith(".mp4") || !thumbnailforms.some(r => data.thumbnail.endsWith(r))));
        let localId = Utils.newId(10);
        let jeffys = ["jefy","jeffy","j3ffy"];
        if(jeffys.some(r => data.title.toLowerCase().includes(r)))return;
        if(catalogue.titles.includes(data.title)){
            socket.emit("err","There is already a video with this name.");
            return;
        } else {
            catalogue.titles = [...catalogue.titles,data.title];
        }
        data = {
            author:Utils.sanitizeString(data.author).substring(0,28),
            title:Utils.sanitizeString(data.title).substring(0,40),
            src:Utils.sanitizeString(data.src).trim(" "),
            thumbnail:Utils.sanitizeString(data.thumbnail).trim(" ")
        }
        console.log("/// DER LOG: "+data.author+", "+data.title+" //// "+socket.ip);
        maxDate++;
        console.log("-- "+maxDate+" --");
        fs.writeFile('./user_cont/videos/#'+localId+'.json', `
            {
            "title":"${data.title}",
            "views":0,
            "author":"${data.author}",
            "id":"#${localId}",
            "type":"mp4",
            "src":"${data.src}",
            "date":${maxDate},
            "thumbnail":"${data.thumbnail}",
            "creator":"${socket.ip}"
            }
        `, (err) => {
            if (err) {
                console.error('Error creating file:', err);
            } else {
                console.log('File created successfully!');
            }
        });
        socket.emit("uploadsucceed","true");
        compileMostViewed();
    });
});