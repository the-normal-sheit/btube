let socket = io(location.href);

function $(a){return document.getElementById(a);}
let myUsername = getCookie("username") || "";
function setCookie(name, value, days = 30) {
    let expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
    const value = document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1];
    return value ? decodeURIComponent(value) : undefined;
}

if (myUsername) {
    document.getElementById("usernameInput").value = myUsername;
}

$("saveButton").addEventListener("click", ()=> {
    let username = document.getElementById("usernameInput").value;
    setCookie("username", username);
    myUsername = username;
    alert("Username saved for next video.");
});
function id(len){
    let result = "";
    for(let i=0;i<len;i++){
        result+="abcdefghijklmn123456789".charAt(Math.floor(Math.random() * 21));
    }
    return result;
}
const Page = {
    switchSrc:(newHTML)=>{
        $("content").innerHTML = "";
        $('content').style.left='0px';
        $("content").insertAdjacentHTML('beforeend',`
            ${newHTML.replaceAll("placeid=","id=")}
        `);
    },
    video:(newVideo)=>{
        let localId = id(5);
    
        Page.switchSrc(`
            <button id="${localId}admin" style="position:absolute;display:none;top:0px;right:0px;">🔨</button>
            <video controls width="300">
                <source src="${newVideo["src"]}" type="video/mp4" />
            </video>
            <br>
            <button id="${localId}">Share 🔗</button>
            <button id="${localId}delete">🗑️</button>
            <br>
            <div id="${localId}url" style="visibility:hidden;">
            <input style="width:200px;" id="${localId}val" type="text" disabled>
            <button id="${localId}copy">Copy Link 📃</button>
            </div>
            <hr>
            <p style="color:black;background-color:white;border-radius:5px;padding:5px;max-width:400px;">
            <span style="font-size:20px;">${newVideo["title"]}</span><br>
            <span style="font-size:14px;color:gray;text-shadow:1px 1px 1px rgba(0,0,0,0.3);">
            Author: ${newVideo["author"]}
            </span><br>
            <span style="font-size:14px;color:gray;text-shadow:1px 1px 1px rgba(0,0,0,0.3);">
            Views: ${newVideo["views"]}
            <br>
            <span style="font-size:14px;color:gray;text-shadow:1px 1px 1px rgba(0,0,0,0.3);">
            Upload date: ${newVideo["timestamp"] == "Unknown" ? "Before time stamp update" : newVideo["timestamp"]}
            </span>
            </p>
        `);
        setTimeout(() => {
            $(localId+"val").value = location.href + "video?id="+newVideo["id"].replace("#","");
            $(localId).onclick =()=>{ $(localId+"url").style.visibility="visible";}
            $(localId+"copy").onclick =()=>{
                let copiz = $(localId+"val");
                copiz.select();
                let cc = copiz.value;
                if(cc.includes("?video="))cc = cc.substring(0,cc.indexOf("?video="))+ "?video="+newVideo["id"].replace("#","");
                copiz.setSelectionRange(0, 99999); // For mobile devices
                navigator.clipboard.writeText(cc);
                alert("URL copied!");
            }
            $(localId+"delete").onclick = () => {
                let pass = prompt("Admin password for video deletion?") || "none";
                socket.emit("delete",{id:newVideo["id"],password:pass});
            }
        },100);
    },
}
socket.on("alert",data=>{alert(data);});
socket.on("home",data=>{
    console.log(data);
     $("content").innerHTML = "";
    Page.switchSrc($("trending").innerHTML);
     $("content").innerHTML = $("content").innerHTML.replaceAll("<h1>Loading...</h1>","");
    let queue = 0;
    let row = 1;
    data.most.forEach(video => {
        queue++;
        let localId = video["id"].substring(1,video["id"].length); 
        if(queue > 2){queue = 1; row++;}
        if($('trending_'+row) == null){
            $("content").insertAdjacentHTML('beforeend',`
                <div class="menu thumbs videofront" id="trending_${row}">
                <div class="thumbnail" id="${localId}">
                    <img class="thumbcont" src="${video["thumbnail"]}" width="100" height="56">
                    <p>
                    <span class="title">${video["title"]}</span>
                    <br>
                    <span class="author">${video["author"]}</span>
                    <br>
                    <span class="author">Views: ${video["views"]}</span>
                    </p>
                </div>
                </div>
            `);
             setTimeout(() => {$(localId).onclick = () => {Page.video(video);socket.emit("goto",video["id"]);}},100);
        } else {
        
            $('trending_'+row).insertAdjacentHTML('beforeend',`
                <div class="thumbnail" id="${localId}">
                    <img class="thumbcont" src="${video["thumbnail"]}" width="100" height="56">
                    <p>
                    <span class="title">${video["title"]}</span>
                    <br>
                    <span class="author">${video["author"]}</span>
                    <br>
                    <span class="author">Views: ${video["views"]}</span>
                    </p>
                </div>
            `);
             setTimeout(() => {$(localId).onclick = () => {Page.video(video);socket.emit("goto",video["id"]);}},100);
        }
    });
    data.new = data.new.slice(0,10);
    data.new.forEach(video => {
        queue++;
        let localId = video["id"].substring(1,video["id"].length) + '_2'; 
        if(queue > 2){queue = 1; row++;}
        if($('newest_'+row) == null){
            $("newer").insertAdjacentHTML('beforeend',`
                <div class="menu thumbs" id="newest_${row}">
                <div class="thumbnail" id="${localId}">
                    <img class="thumbcont" src="${video["thumbnail"]}" width="100" height="56">
                    <p>
                    <span class="title">${video["title"]}</span>
                    <br>
                    <span class="author">${video["author"]}</span>
                    <br>
                    <span class="author">Views: ${video["views"]}</span>
                    </p>
                </div>
                </div>
            `);
             setTimeout(() => {$(localId).onclick = () => {Page.video(video);socket.emit("goto",video["id"]);}},100);
        } else {
        
            $('newest_'+row).insertAdjacentHTML('beforeend',`
                <div class="thumbnail" id="${localId}">
                    <img class="thumbcont" src="${video["thumbnail"]}" width="100" height="56">
                    <p>
                    <span class="title">${video["title"]}</span>
                    <br>
                    <span class="author">${video["author"]}</span>
                    <br>
                    <span class="author">Views: ${video["views"]}</span>
                    </p>
                </div>
            `);
             setTimeout(() => {$(localId).onclick = () => {Page.video(video);socket.emit("goto",video["id"]);}},100);
        }
    });
});
if(window.innerWidth < 800){
    
} else {
    $("left").style.display = 'none';
    $("right").style.display = 'none';
}
socket.on("err",data=>alert("ERROR: "+data));
socket.on("uploadsucceed",data=>{
    alert("Upload success!");
    socket.emit("home",{user:"Anonymous"});
});
function sharedUrlCheck(){
    if(location.href.includes("?video="))location.href=location.href.substring(
        0,
        location.href.indexOf("?video=")
    );
}
$("gethome").onclick = () => {
    sharedUrlCheck();
    socket.emit("home",{user:"Anonymous"});
}
$("getChat").onclick = () => {
    sharedUrlCheck();
    Page.switchSrc($("bulletinBoard").innerHTML);
}
$("getupload").onclick = () => {
    sharedUrlCheck();
    Page.switchSrc($("createvideo").innerHTML);
    setTimeout(() => {
        $("uploadvideo").onclick = () => {
            socket.emit("upload",{
                title:$("newtitle").value,
                author:$("newauthor").value,
                src:$("newvideo").value.trim(" "),
                thumbnail:$("newthumbnail").value.trim(" ")
            });
        }
        $("newauthor").value=myUsername;
    },1000);
}
Page.switchSrc($("trending").innerHTML);
socket.emit("home",{user:"Anonymous"});
if(location.href.substring(0,location.href.length-10).endsWith("?video=")){
    setTimeout(() => {
    fetch(location.href.replace("?video=","video?id="))
    .then(response =>{ return response.json()})
    .then(data => {
        Page.video(data);
        socket.emit("goto",data["id"]);
    });
    },1000);
}