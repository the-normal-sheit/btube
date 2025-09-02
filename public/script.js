let socket = io(location.href);
function $(a){return document.getElementById(a);}
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
        $("content").insertAdjacentHTML('beforeend',`
            ${newHTML.replaceAll("placeid=","id=")}
        `);
    },
    video:(newVideo)=>{
        Page.switchSrc(`
            <video controls width="200">
                <source src="${newVideo["src"]}" type="video/mp4" />
            </video>
            <hr>
            <p style="color:black;background-color:white;border-radius:5px;padding:5px;max-width:400px;">
            <span style="font-size:20px;">${newVideo["title"]}</span><br>
            <span style="font-size:14px;color:gray;text-shadow:1px 1px 1px rgba(0,0,0,0.3);">
            Author: ${newVideo["author"]}
            </span><br>
            <span style="font-size:14px;color:gray;text-shadow:1px 1px 1px rgba(0,0,0,0.3);">
            Views: ${newVideo["views"]}
            </span>
            </p>
        `)
    }
}
socket.on("home",data=>{
    console.log(data);
    let queue = 0;
    let row = 1;
    data.forEach(video => {
        queue++;
        if($('trending_'+row) == null){
            $("content").insertAdjacentHTML('beforeend',`
                <div class="menu thumbs" id="trending_${row}">
                </div>
            `);
        }
        if(queue > 2){queue=0;row++;}
        let localId = video["id"].substring(1,video["id"].length);
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
    });
});
$("gethome").onclick = () => {
    Page.switchSrc($("trending").innerHTML);
    socket.emit("home",{user:"Anonymous"});
}
$("getupload").onclick = () => {
    Page.switchSrc($("createvideo").innerHTML);
    setTimeout(() => {
        $("uploadvideo").onclick = () => {
            socket.emit("upload",{
                title:$("newtitle").value,
                author:$("newauthor").value,
                src:$("newvideo").value,
                thumbnail:$("newthumbnail").value
            });
        }
    },200);
}
socket.emit("home",{user:"Anonymous"});
if(location.href.substring(0,location.href.length-10).endsWith("?video=")){
    setTimeout(() => {
    fetch(location.href.replace("?video=","video?id="))
    .then(response =>{ return response.json()})
    .then(data => {
        Page.video(data);
    });
    },1000);
}