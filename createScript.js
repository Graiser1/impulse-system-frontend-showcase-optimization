var data = {}

var userFile = {}

import { createChart, createMatrixInput } from './components.js';

await fetch('./data2.json')
    .then((response) => response.json())
    .then((json) => data = json);

//aapl = FileAttachment("aapl.csv").csv({typed: true})

async function loadFile(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return await response.text();
}

function autoType(row) {
    for (const key in row) {
        const value = row[key];
        if (!isNaN(value)) {
            row[key] = +value; // Преобразуем в число
        } else if (Date.parse(value)) {
            row[key] = new Date(value); // Преобразуем в дату
        }
    }
    return row;
}

// chartDataNotParsed = await loadFile('./aapl.csv');

// Парсинг данных, если это CSV
//const chartData = d3.csvParse(chartDataNotParsed, autoType);

//console.log(data)

//
var statusFlagConstants = {
    idle: 0,
    addNodeStart: 1,
    addLinkStart: 2,
    addLinkFirstSelected: 21,
    editNodeStarted: 3,
    impulseEditing: 4
}

//VARIABLES

var statusText = document.getElementById("status")

var statusFlag = statusFlagConstants.idle;

var firstNodeForLink = {}
var secondNodeForLink = {}

var tempNodeForEdit = {}
var tempLinkForEdit = {}

var impulseSteps = 0

var loggedUser = null

var nodeRadius = 40

function setStatusText() {
    if (statusFlag == statusFlagConstants.idle) statusText.innerHTML = "idle";
    if (statusFlag == statusFlagConstants.addNodeStart) statusText.innerHTML = "Добавление новой вершины. Нажмите на место, куда вы хотите добавить вершину";
    if (statusFlag == statusFlagConstants.addLinkStart) statusText.innerHTML = "Добавление нового ребра. Выберите любую из вершин для присоединения начала ребра";
    if (statusFlag == statusFlagConstants.addLinkFirstSelected) statusText.innerHTML = "Добавление нового ребра. Выберите любую из вершин для присоединения конца ребра";
    if (statusFlag == statusFlagConstants.editNodeStarted) statusText.innerHTML = "Изменение вершины. Выберите вершину, которую хотите отредактировать";
    if (statusFlag == statusFlagConstants.impulseEditing) statusText.innerHTML = "Работа с импульсами";
}

setStatusText()

// Specify the dimensions of the chart.
const width = 600;
const height = 600;

let mouse = null;

// Specify the color scale.
const color = d3.scaleSequential(d3.interpolateRdYlGn);
console.log(color)

// The force simulation mutates links and nodes, so create a copy
// so that re-evaluating this cell produces the same result.
var links = data.links.map(d => ({ ...d }));
var nodes = data.nodes.map(d => ({ ...d }));

let maxNodeValue = 0
let minNodeValue = 9999999

function updateMinMaxNodeValue(){
    nodes.forEach(element =>{
        if (element.value>maxNodeValue) maxNodeValue = element.value
        if (element.value<minNodeValue) minNodeValue = element.value
    })
}

let maxLinkValue = 0
let minLinkValue = 9999999

function updateMinMaxLinkValue(){
    links.forEach(element =>{
        if (element.value>maxLinkValue) maxLinkValue = element.value
        if (element.value<minLinkValue) minLinkValue = element.value
    })
    console.log(minLinkValue+" "+maxLinkValue)
}


updateMinMaxNodeValue()
updateMinMaxLinkValue()

// Create a simulation with several forces.
var simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-1))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(88)) // Добавляем силу коллизии
    .on("tick", ticked);

function updateSimulation(){
    // simulation = d3.forceSimulation(nodes)
    // .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    // .force("charge", d3.forceManyBody().strength(-1))
    // .force("center", d3.forceCenter(width / 2, height / 2))
    // .force("collide", d3.forceCollide().radius(88)) // Добавляем силу коллизии
    // .on("tick", ticked);
}

// Create the SVG container.
var svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: 98%; width: 98%")
    // .on("click", clicked)
    .on("click", svgClicked)

// Добавляем SVG элемент для маркера стрелки
svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 35) // Убедитесь, что значение refX соответствует длине стрелки
    .attr("refY", 5)
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 L 10 5 L 0 10 Z") // Треугольная стрелка
    .attr("fill", "#999")
    .on("click", editLink)

// Добавляем линии для рёбер
var link = svg.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", d => color((d.value-minLinkValue)/(maxLinkValue-minLinkValue+1)))
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#arrowhead)")
    .on("click", editLink)
; // Используем маркер стрелки

function updateLineView() {
    //console.log(links)
    link = link
        .data(links)
        .join(
            enter => enter.append("line")
            .attr("stroke", d => color((d.value-minLinkValue)/(maxLinkValue-minLinkValue+1)))
                .attr("stroke-width", 2)
                .attr("marker-end", "url(#arrowhead)")
                .on("click", editLink),// Инициализация новых элементов
            update => update.attr("stroke-width", 2)
                .attr("marker-end", "url(#arrowhead)"), // Обновление существующих элементов
            exit => exit.remove() // Удаление вышедших элементов
        );
        console.log(nodes)
    //.join("line")
    //.attr("stroke-width", 2)
    //.attr("marker-end", "url(#arrowhead)"); // Убедитесь, что маркер стрелки обновляется
}

var node = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll()
    .data(nodes)
    .join("circle")
    .attr("r", nodeRadius)
    .attr("fill", d => color((d.value-minNodeValue)/(maxNodeValue-minNodeValue+1))).on("click", nodeClicked);

function updateNodeView(){
    node = node
        .data(nodes)
        .join(
            enter => enter.append("circle").attr("r", 0)
                .attr("fill", d => {
                    console.log(d)
                    return color((d.value-minNodeValue)/(maxNodeValue-minNodeValue+1))
                }
                ).on("click", nodeClicked)
                .call(enter => enter.transition().attr("r", nodeRadius)),
            update => update.transition() // Добавляем переход для плавного обновления
                .attr("fill", d => color((d.value-minNodeValue)/(maxNodeValue-minNodeValue+1))) // Обновляем цвет для существующих узлов,
                .call(update => update.attr("r", nodeRadius)),
            exit => exit.remove()
        );
}

// Добавляем группу для текста
var linkText = svg.append("g")
    .selectAll("text")
    .data(links)
    .join("text")
    .attr("class", "link-text")
    .text(d => d.value)
    .on("click", editLink);

function updateLinkTextView(){
    linkText = linkText
        .data(links)
        .join("text")
        .attr("class", "link-text")
        .text(d => d.value)
        .on("click", editLink);
}

// Добавляем группу для текста
var circlesText = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 10)
    .join("text")
    .attr("fill", "#f1f1f1")
    .attr("class", "circle-text")
    .each(function(d) {
        var words = d.text.split(' ');
        words.forEach((word, i) => {
            d3.select(this).append('tspan')
                .attr("stroke", "black")
                .attr("stroke-width", 0.4)
                .attr('x', d => d.x)
                .attr('dy', i == 0 ? '0em' : '1.0em')
                .text(word);
        });
    })
    .on("click", nodeClicked);

function updateCirclesTextView() {
    circlesText = circlesText
        .data(nodes)
        .join("text")
        .attr("stroke", "black")
        .attr("stroke-width", 0.4)
        .attr("class", "circle-text")
        .each(function(d) {
            // Очистка старых tspan элементов
            d3.select(this).selectAll('tspan').remove();
            var words = d.text.split(' ');
            words.forEach((word, i) => {
                d3.select(this).append('tspan')
                    .attr("stroke", "black")
                    .attr("stroke-width", 0.4)
                    .attr('x', d => d.x)
                    .attr('dy', i == 0 ? '0em' : '1.0em')
                    .text(word);
            });
        })
        .on("click", nodeClicked);
}

// Добавляем группу для текста
var circlesValueText = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class", "circle-text")
    .text(d => d.value)
    .on("click", nodeClicked);

function updateCirclesValueTextView() {
    circlesValueText = circlesValueText
        .data(nodes)
        .join("text")
        .attr("class", "circle-text")
        .text(d => d.value)
        .on("click", nodeClicked);
}

// Позиционируем текст посередине каждого ребра
linkText.attr("x", d => (d.source.x + d.target.x) / 2)
    .attr("y", d => (d.source.y + d.target.y) / 2);

// Add a drag behavior.
node.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended))


circlesText.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended))

circlesValueText.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended))

// Set the position attributes of links and nodes each time the simulation ticks.
function ticked() {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    linkText.attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);

    circlesText.selectAll('tspan')
        .attr('x', function(d) {
            return d3.select(this.parentNode).attr('x');
        });

    circlesText.attr("x", d => d.x-20)
        .attr("y", d => d.y-8);

    circlesValueText.attr("x", d => d.x - 10)
        .attr("y", d => d.y+18);
}

// Reheat the simulation when drag starts, and fix the subject position.
function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
}

// Update the subject (dragged node) position during drag.
function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
}

// Restore the target alpha so the simulation cools after dragging ends.
// Unfix the subject position now that it’s no longer being dragged.
function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
}

function editLink(event){
    if(statusFlag != statusFlagConstants.editNodeStarted) return
    console.log("hello")
    let tempLink = event.srcElement.__data__
    tempLinkForEdit = tempLink
    document.getElementById("editLinkValueInput").value = tempLinkForEdit.value
    document.getElementById("linkForm").style.display = "block"
}

submitEditLinkButton.addEventListener("click", () => {
    links.forEach(element => {
        if(element.source == tempLinkForEdit.source && element.target == tempLinkForEdit.target){
            element.value = document.getElementById("editLinkValueInput").value;
        }
    })
    document.getElementById("linkForm").style.display = "none"
    statusFlag = statusFlagConstants.idle
    reRender()
})

// When this cell is re-run, stop the previous simulation. (This doesn’t
// really matter since the target alpha is zero and the simulation will
// stop naturally, but it’s a good practice.)
//invalidation.then(() => simulation.stop());

/*
function renderGraph() {
  svg.selectAll("*").remove();

  links = data.links.map(d => ({ ...d }));
  nodes = data.nodes.map(d => ({ ...d }));

  simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(200))
    .force("charge", d3.forceManyBody().strength(-1))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .on("tick", ticked);

  // Add a line for each link, and a circle for each node.
  link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll()
    .data(links)
    .join("line")
    .attr("stroke-width", d => Math.sqrt(d.value));

  node = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll()
    .data(nodes)
    .join("circle")
    .attr("r", 50)
    .attr("fill", d => color(d.group)).on("click", nodeClicked);

  // Добавляем группу для текста
  linkText = svg.append("g")
    .selectAll("text")
    .data(links)
    .join("text")
    .attr("class", "link-text")
    .text(d => d.text);

  circlesText = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class", "circle-text")
    .text(d => d.text);

  ticked()


  node.append("title")
    .text(d => d.id);

  //node.append("text").text(d => d.id);

  // Add a drag behavior.
  node.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended))
}*/

/*
function clicked(event) {
  console.log("sdadasdad")
  mousemoved.call(this, event);
  console.log("sdadasdad")
  spawn({id: uuidv4(), group: 1, x: mouse.x, y: mouse.y});
}
*/

function svgClicked(event) {
    if (statusFlag == statusFlagConstants.addNodeStart) {
        mousemoved.call(this, event);
        spawn({ id: uuidv4(), group: 1, text:"New Edge",  x: mouse.x, y: mouse.y , value: 1});
        statusFlag = statusFlagConstants.idle
        setStatusText()
    }
}

function addNewLink() {
    var newLink = {
        source: firstNodeForLink.id,
        target: secondNodeForLink.id,
        value: 1,
        label: "1"
    }
    links.push(newLink);
    reRender()
}

//DELETE NODE BUTTON
deleteNodeButton.addEventListener('click', () => {
    nodes = nodes.filter(node => node.id !== tempNodeForEdit.id);
    console.log("links before")
    console.log(links)
    links = links.filter(link => (link.source.id !== tempNodeForEdit.id) && (link.target.id !== tempNodeForEdit.id));
    console.log("links after")
    console.log(links)
    /*
    nodes.forEach(element =>{
      if(element.id == tempNodeForEdit.id) nodes.remove(element)
    })
    links.forEach(
      element =>{
        if((element.target == tempNodeForEdit.id)||(element.source == tempNodeForEdit.id)) links.remove(element)
      }
    )*/
    statusFlag = statusFlagConstants.idle
    setStatusText
    document.getElementById("myForm").style.display = "none"
    reRender()
})

function nodeClicked(event) {
    console.log(event)
    console.log(event.srcElement.__data__)
    console.log((event.srcElement.__data__.value-minNodeValue)/(maxNodeValue-minNodeValue+1))
    if (statusFlag == statusFlagConstants.addLinkStart) {
        firstNodeForLink = event.srcElement.__data__
        statusFlag = statusFlagConstants.addLinkFirstSelected
        setStatusText()
        console.log(event.srcElement.__data__)
        return
    }
    if (statusFlag == statusFlagConstants.addLinkFirstSelected) {
        secondNodeForLink = event.srcElement.__data__
        addNewLink()
        statusFlag = statusFlagConstants.idle
        setStatusText()
        return
    }
    if (statusFlag == statusFlagConstants.editNodeStarted) {
        var tempNode = event.srcElement.__data__
        tempNodeForEdit = tempNode
        document.getElementById("editNodeNameInput").value = tempNode.text
        document.getElementById("editNodeValueInput").value = tempNode.value
        openForm()
        statusFlag = statusFlagConstants.idle
        setStatusText()
        return
    }

}

function mousemoved(event) {
    const [x, y] = d3.pointer(event);
    mouse = { x, y };
    simulation.alpha(0.3).restart();
}

function spawn(source) {
    nodes.push(source);

    reRender()
}

function reRender() {
    console.log("rerender!!!")
    links.forEach(link => {
        link.source = nodes.find(node => node.id === link.source.id) || link.source;
        link.target = nodes.find(node => node.id === link.target.id) || link.target;
    });
    updateMinMaxNodeValue()

    updateSelect()

    updateLineView()

    updateNodeView()

    updateCirclesTextView()

    updateCirclesValueTextView()

    updateLinkTextView()


    // Add a drag behavior.
    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    circlesText.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    circlesValueText.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();

    svg.property("value", {
        nodes: nodes.map(d => ({ id: d.index })),
        links: links.map(d => ({ source: d.source.index, target: d.target.index }))
    });

    svg.dispatch("input");
}

/*
addNodeButton.addEventListener('click', () => {
  data.nodes.push(newEdge)
  //console.log(data)
  container.innerHTML = "fdsazfsafd"
  container.append(svg.node())
  console.log(node)
  renderGraph()
});*/

container.append(svg.node())
//renderGraph()

//ADD NEW NODE BUTTON LEGACY
addNewNodeButton.addEventListener('click', () => {
    statusFlag = statusFlagConstants.addNodeStart
    setStatusText()
});

//ADD NEW LINK BUTTON
addNewLinkButton.addEventListener('click', () => {
    statusFlag = statusFlagConstants.addLinkStart
    setStatusText()
});

//EDIT NODE BUTTON
editNodeButton.addEventListener('click', () => {
    statusFlag = statusFlagConstants.editNodeStarted
    setStatusText()
});

//EDIT NODE CLOSE BUTTON
editNodeCloseButton.addEventListener('click', () => {
    document.getElementById("myForm").style.display = "none";
});

var impulseMatrix = []

//IMPULSE SUBMIT BUTTON
impulseSubmitButton.addEventListener('click', () => {
    let impulses = []
    /*
    let count = 0
    nodes.forEach(element =>{
      let id = "impulseInput:"+count+"-"+0
      impulses.push(document.getElementById(id).value)
      count++
    })*/
    impulseMatrix = []
// Добавляем строки
    for (let i = 0; i < nodes.length; i++) {
        const row = [];
        // Добавляем объекты в строки
        for (let j = 0; j < impulseSteps; j++) {
            let id = "impulseInput:"+i+"-"+j
            if(isNaN(parseInt(document.getElementById(id).value))) {row.push(0)}
            else{
                row.push(parseInt(document.getElementById(id).value));}
        }
        impulseMatrix.push(row);
    }
    if(impulseSteps>0){
        document.getElementById("impulseRemoveStepButton").style.visibility = "hidden"
        document.getElementById("impulseForNodeContainer").style.visibility = "hidden"
        document.getElementById("impulseSubmitButton").style.visibility = "hidden"
        document.getElementById("impulseAddStepButton").style.visibility = "hidden"
        document.getElementById("doImpuleStepContainer").style.visibility = "visible"
        document.getElementById("doImpulseStepButton").style.visibility = "visible"
    }

    console.log(impulseMatrix)
});

//IMPULSE STEPS ADD BUTTON
impulseAddStepButton.addEventListener('click', () => {
    impulseSteps++
    let rowHeaders = []
    let columnHeaders = []
    nodes.forEach(element=>{
        rowHeaders.push(element.text)
    })
    for (let i = 0;i<impulseSteps;i++){
        columnHeaders.push(i+1)
    }
    document.getElementById("totalImpulseStepsSpan").innerHTML = "Количество шагов: "+impulseSteps;
    createMatrixInput("impulse", "impulseInputContainer", nodes.length, impulseSteps, rowHeaders, columnHeaders)
    document.getElementById("impulseRemoveStepButton").style.visibility = "visible"
    document.getElementById("impulseForNodeContainer").style.visibility = "visible"
    document.getElementById("impulseSubmitButton").style.visibility = "visible"
});

var selectedImpulseNodesIds = []

//IMPULSE STEPS REMOVE BUTTON
impulseRemoveStepButton.addEventListener('click', () => {
    if(impulseSteps!=0){
        impulseSteps--
        if (impulseSteps==0) {
            document.getElementById("impulseInputContainer").innerHTML = ""
            document.getElementById("impulseRemoveStepButton").style.visibility = "hidden"
            document.getElementById("impulseForNodeContainer").style.visibility = "hidden"
            document.getElementById("impulseSubmitButton").style.visibility = "hidden"
            document.getElementById("totalImpulseStepsSpan").innerHTML = "Количество шагов: "+impulseSteps;
            return
        }
        let rowHeaders = []
        let columnHeaders = []
        nodes.forEach(element=>{
            rowHeaders.push(element.text)
        })
        for (let i = 0;i<impulseSteps;i++){
            columnHeaders.push(i+1)
        }
        createMatrixInput("impulse", "impulseInputContainer", nodes.length, impulseSteps, rowHeaders, columnHeaders)}
    //show selected node rows
    selectedImpulseNodesIds.forEach(element => {
        console.log("impulseRow:"+element)
        document.getElementById("impulseRow:"+element).style.display = "flex"
    })
    document.getElementById("totalImpulseStepsSpan").innerHTML = "Количество шагов: "+impulseSteps;
});

//ADD IMPULSE FOR NODE BUTTON
impulseAddNodeButton.addEventListener('click', () => {
    let rowId = "impulseRow:";
    let selectedNode = document.getElementById("nodeForImpulseSelect").value
    fillNodeAndLinkMaps()
    rowId+=nodesNumbersMap.get(selectedNode)
    selectedImpulseNodesIds.push(nodesNumbersMap.get(selectedNode))
    //console.log(nodesNumbersMap.get(selectedNode))
    console.log(selectedImpulseNodesIds)
    document.getElementById(rowId).style.display = "flex"
});

//SAVE SELECTED NETWORK BUTTON
networkSaveButton.addEventListener('click', async ()=>{
    let linksForJson = []
    links.forEach(element => {
        linksForJson.push({source: element.source.id, target: element.target.id, value: element.value, label: element.label})
    })
    let jsonNetwork = {nodes: nodes, links: linksForJson}
    let data = {
        name: document.getElementById("networkNameInput").value,
        userId: loggedUser.id,
        networkJson: JSON.stringify(jsonNetwork)
    }
    console.log(data)
    if(loggedUser == null) return;
    else{
        let url = "http://127.0.0.1:8080/api/networks"
        const response = await fetch(url, {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(data), // body data type must match "Content-Type" header
        });
        let json = await response.json()
        console.log(json)
    }
})

//OPEN SELECTED NETWORK BUTTON
openSelectedNetworkButton.addEventListener('click', async () => {
    let network = null;
    if(loggedUser == null) return;
    else {
        let url = "http://127.0.0.1:8080/api/networks/"+document.getElementById("networkSelect").value
        const response = await fetch(url, {
            method: "GET", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            //body: JSON.stringify(data), // body data type must match "Content-Type" header
        });
        let json = await response.json()
        console.log(json)
        if(json!=null) network = JSON.parse(json.networkJson);
        nodes = network.nodes;
        links = network.links;
        reRender();
        console.log(links)
    }
})


//TEST BUTTON
testButton.addEventListener('click', async () => {
});

//SUBMIT EDIT NODE BUTTON
submitEditNodeButton.addEventListener('click', () => {
    statusFlag = statusFlagConstants.idle
    console.log(nodes)
    nodes.forEach(element => {
        if (element.id == tempNodeForEdit.id) {
            element.text = document.getElementById("editNodeNameInput").value
            element.value = parseInt(document.getElementById("editNodeValueInput").value)
        }
    });
    reRender()
    setStatusText()
    document.getElementById("myForm").style.display = "none"
});



function openForm() {
    document.getElementById("myForm").style.display = "block";
}

function closeForm() {
    document.getElementById("myForm").style.display = "none";
}

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

let nodesNumbersMap = new Map()
let nodesMap = new Map()
let nodesNumberNodeMap = new Map()

function fillNodeAndLinkMaps(){
    let tempNumber = 0;
    nodes.forEach(element => {
        nodesNumbersMap.set(element.id, tempNumber)
        nodesMap.set(element.id, element)
        nodesNumberNodeMap.set(tempNumber, element)
        tempNumber++
    });
    links.forEach(element=>{

        }
    )
    //console.log(nodesNumbersMap)
}

let nodeMatrix = [];
let nodeValuesMatrix = [];

function fillNodeValuesMatrixStart() {
    nodeValuesMatrix = []
    fillNodeAndLinkMaps()
    // Добавляем строки
    for (let i = 0; i < nodes.length; i++) {
        const row = [];
        // Добавляем объекты в строки
        row.push(nodesNumberNodeMap.get(i).value);
        nodeValuesMatrix.push(row);
    }}

function fillNodeMatrix(){
    nodeMatrix = []
    fillNodeAndLinkMaps()
// Добавляем строки
    for (let i = 0; i < nodes.length; i++) {
        const row = [];
        // Добавляем объекты в строки
        for (let j = 0; j < nodes.length; j++) {
            row.push(0);
        }
        nodeMatrix.push(row);
    }

    links.forEach(element=>{
        let node1 = nodesMap.get(element.source.id)
        let node2 = nodesMap.get(element.target.id)

        nodeMatrix[nodesNumbersMap.get(node1.id)][nodesNumbersMap.get(node2.id)] = element.value
    })
}

function updateSelect(){
    document.getElementById("nodeForImpulseSelect").innerHTML = ""
    nodes.forEach(element=>{
        const opt = document.createElement("option")
        opt.value = element.id
        opt.text = element.text
        document.getElementById("nodeForImpulseSelect").appendChild(opt)
    })
}

updateSelect()

var currImpulseStep = 0;
var resValues = [];

function doImpulseStep(){
    if(currImpulseStep==impulseSteps+1) return

    //console.log(nodeMatrix)
    //console.log(impulseMatrix)
    console.log("nodeValuesMatrix v0:")
    console.log(nodeValuesMatrix)

    //console.log(addMatrices(nodeValuesMatrix, getColumnMatrix(impulseMatrix, 0)))
    if(currImpulseStep==0){
        fillNodeMatrix()
        nodeMatrix = transpose(nodeMatrix)
        fillNodeValuesMatrixStart()
        resValues = addMatrices(nodeValuesMatrix, getColumnMatrix(impulseMatrix, 0))
        //console.log("v0+p0")
        //console.log(addMatrices(nodeValuesMatrix, getColumnMatrix(impulseMatrix, 0)))
        currImpulseStep++
        return
    }
    else{
        let resColumn = getColumnMatrix(resValues, resValues[0].length-1)
        for(let i=0;i<currImpulseStep+1;i++){
            let Apow = matrixPower(nodeMatrix, currImpulseStep-i)
            console.log(currImpulseStep-i)
            console.log(Apow+"i")
            let ApowXimpulse = []
            if(currImpulseStep==impulseSteps){
                ApowXimpulse = multiplyMatrices(Apow, getColumnMatrix(impulseMatrix, i-1))
                for(let k=0;k<ApowXimpulse.length;k++){
                    ApowXimpulse[k][0]=0;
                }
            }
            else{
                ApowXimpulse = multiplyMatrices(Apow, getColumnMatrix(impulseMatrix, i))
            }

            console.log("ApowXimpulse"+i)
            console.log(ApowXimpulse)
            resColumn = addMatrices(resColumn, ApowXimpulse)
            console.log("resColumn")
            console.log(resColumn)
        }
        for(let i=0;i<resValues.length;i++){
            resValues[i].push(resColumn[i][0])
        }
        currImpulseStep++
        document.getElementById("impulseChartContainer").style.display = "block"
    }
    console.log("res")
    console.log(resValues)
    for(let i=0;i<resValues.length;i++){
        nodesNumberNodeMap.get(i).value = resValues[i][currImpulseStep-1]
    }
    reRender()
}

function transpose(matrix) {
    // Получаем количество строк и столбцов в исходной матрице
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Создаем новую матрицу с транспонированными размерами
    const transposedMatrix = [];

    for (let j = 0; j < cols; j++) {
        // Создаем новую строку для транспонированной матрицы
        transposedMatrix[j] = [];
        for (let i = 0; i < rows; i++) {
            // Заполняем новую строку элементами из столбца исходной матрицы
            transposedMatrix[j][i] = matrix[i][j];
        }
    }

    return transposedMatrix;
}

function matrixPower(matrix, power) {
    if (power < 0) {
        throw new Error("Power should be a non-negative integer.");
    }

    // Создаем единичную матрицу той же размерности
    let result = identityMatrix(matrix.length);

    // Умножаем матрицу на себя power раз
    for (let i = 0; i < power; i++) {
        result = multiplyMatrices(result, matrix);
    }

    return result;
}

function identityMatrix(size) {
    const identity = [];
    for (let i = 0; i < size; i++) {
        identity[i] = [];
        for (let j = 0; j < size; j++) {
            identity[i][j] = (i === j) ? 1 : 0;
        }
    }
    return identity;
}

function multiplyMatrices(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (colsA !== rowsB) {
        throw new Error("Number of columns in the first matrix must be equal to the number of rows in the second.");
    }

    const result = [];
    for (let i = 0; i < rowsA; i++) {
        result[i] = [];
        for (let j = 0; j < colsB; j++) {
            let sum = 0;
            for (let k = 0; k < colsA; k++) {
                sum += A[i][k] * B[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

function addMatrices(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (rowsA !== rowsB || colsA !== colsB) {
        throw new Error("Matrices must have the same dimensions to be added.");
    }

    const result = [];
    for (let i = 0; i < rowsA; i++) {
        result[i] = [];
        for (let j = 0; j < colsA; j++) {
            result[i][j] = A[i][j] + B[i][j];
        }
    }
    return result;
}

function getColumnMatrix(matrix, columnNumber){
    const result = []
    for(let i=0;i<matrix.length;i++){
        let row = []
        row.push(matrix[i][columnNumber])
        result.push(row)
    }
    return(result)
}

//DO IMPULSE STEP BUTTON
doImpulseStepButton.addEventListener('click', () => {
    if(currImpulseStep==impulseSteps) {
        document.getElementById("impulseStepSpan").innerHTML = "все шаги выполнены"
        return
    }
    doImpulseStep();
    const elements = document.querySelectorAll(".impulseColumn-"+currImpulseStep);
    if(currImpulseStep!=0){
        const elementsActive = document.querySelectorAll(".activeColumn");
        elementsActive.forEach(element => {
            element.className= "impulseColumn-"+currImpulseStep-1
        });
    }
    // Перебираем все элементы и изменяем их стиль
    elements.forEach(element => {
        element.className+= " activeColumn"
    });
    document.getElementById("impulseStepSpan").innerHTML = "номер текущего шага: " + currImpulseStep
    document.getElementById("impulseChartContainer").style.display = "flex"
    let nodeNames = [];
    for (let i=0;i<nodes.length;i++){
        nodeNames.push(nodesNumberNodeMap.get(i).text)
    }
    createChart("impulseChartContainer", resValues, nodeNames)
});
//SUBMIT EDIT NETWORK BUTTON
submitBuiltNetworkButton.addEventListener('click', ()=>{
    statusFlag=statusFlagConstants.impulseEditing
    setStatusText()
    document.getElementById("impulseEditor").style.display = "block"

    document.getElementById("network-edit-menu").style.visibility = "hidden"
    document.getElementById("impulseEditor").style.visibility = "visible"
    document.getElementById("returnEditNetworkButton").style.display = "block"
    document.getElementById("totalImpulseStepsSpan").innerHTML = "Количество шагов: "+impulseSteps;
    document.getElementById("container").style.width = "60%"

    resetImpulseEditing()
})

//RETURN EDIT BUTTON
returnEditNetworkButton.addEventListener('click', ()=>{
    statusFlag=statusFlagConstants.idle
    setStatusText()
    document.getElementById("impulseEditor").style.display = "none"
    document.getElementById("impulseChartContainer").style.display = "none"
    document.getElementById("network-edit-menu").style.visibility = "visible"
    document.getElementById("impulseEditor").style.visibility = "hidden"
    document.getElementById("returnEditNetworkButton").style.display = "block"
    document.getElementById("container").style.width = "96%"
    impulseSteps = 0;
    currImpulseStep = 0;
})

//LOGIN BUTTON
loginButton.addEventListener('click', ()=>{
    if(document.getElementById("loginButton").innerHTML!="войти") return
    document.getElementById("LoginForm").style.display = "block"
    document.getElementById("main").style.opacity = 0.3
    document.getElementById("top-menu").style.opacity = 0.3
    console.log()
})

//SUBMIT LOGIN BUTTON
submitLoginButton.addEventListener('click', async ()=>{
    let login = document.getElementById("signInLoginInput").value
    let password = document.getElementById("signInPasswordInput").value
    data = {login: login.toString(), password: password.toString()}
    let url = "http://127.0.0.1:8080/api/auth/login?"+ new URLSearchParams(data)
    const response = await fetch(url, {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        //body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    let json = await response.json()
        //failed login
    if(json==null) document.getElementById("loginFormStatus").innerHTML = "wrong number or password"
        //successful login
    else {
        document.getElementById("loginButton").innerHTML = "user: "+json.login
        document.getElementById("main").style.opacity = 1
        document.getElementById("top-menu").style.opacity = 1
        document.getElementById("loginFormStatus").innerHTML = ""
        document.getElementById("LoginForm").style.display = "none"
        document.getElementById("registerButton").style.display = "none"
        document.getElementById("networkSaveButton").style.display = "block";
        loggedUser = json
        document.getElementById("networkSelect").innerHTML = ""
        if(loggedUser == null) return;
        else{
            let url = "http://127.0.0.1:8080/api/networks/allByUser?"+ new URLSearchParams({userId: loggedUser.id})
            const response = await fetch(url, {
                method: "GET", // *GET, POST, PUT, DELETE, etc.
                mode: "cors", // no-cors, *cors, same-origin
                cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
                credentials: "same-origin", // include, *same-origin, omit
                headers: {
                    "Content-Type": "application/json",
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                },
                redirect: "follow", // manual, *follow, error
                referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                //body: JSON.stringify(data), // body data type must match "Content-Type" header
            });
            let jsonSelect = await response.json()
            let emptyF = 0;
            jsonSelect.forEach(element=>{
                console.log(jsonSelect)
                if(emptyF==0){
                    document.getElementById("networkSelect").style.display = "block";
                    document.getElementById("openSelectedNetworkButton").style.display = "block";
                }
                emptyF=1;
                const opt = document.createElement("option")
                opt.value = element.id
                if(element.name == null || element.name== "") opt.text = "empty name network"
                else opt.text = element.name
                document.getElementById("networkSelect").appendChild(opt)
            })
            document.getElementById("networkNameInputContainer").style.display = "block";
        }
    }
    await console.log(json)
})

//REGISTER BUTTON
registerButton.addEventListener('click', ()=>{
    if(document.getElementById("loginButton").innerHTML!="войти") return
    document.getElementById("RegisterForm").style.display = "block"
    document.getElementById("main").style.opacity = 0.3
    document.getElementById("top-menu").style.opacity = 0.3
    console.log()
})

editLinkCloseButton.addEventListener('click', () =>{
    document.getElementById('linkForm').style.display='none'
    statusFlag = statusFlagConstants.idle
})


//SAVE BUTTON
save_button.addEventListener('click', () =>{
    // Создаём объект
const myObject = {
    nodes: nodes,
    links: links
};

// Преобразуем объект в JSON-строку
const jsonString = JSON.stringify(myObject, null, 2);

// Создаём новый Blob (объект файлового типа) с типом данных application/json
const blob = new Blob([jsonString], { type: "application/json" });

// Создаём ссылку для скачивания
const url = URL.createObjectURL(blob);

    // Инициируем скачивание, открыв ссылку в новом окне
    const a = document.createElement("a");
    a.href = url;
    a.download = "mo4a.json";
    a.style.display = "none"; // Скрываем элемент
    document.body.appendChild(a);
    a.click();

    // Удаляем временную ссылку и элемент <a>
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
})

//LOAD BUTTON
// Получаем элементы
const fileInput = document.getElementById("fileInput");
const openFileBtn = document.getElementById("load_button");

// Обработчик нажатия на кнопку для открытия системного проводника
openFileBtn.addEventListener("click", function() {
    fileInput.click(); // Имитируем клик по скрытому input, чтобы открыть проводник
});

// Обработчик выбора файла
fileInput.addEventListener("change", function(event) {
    const file = event.target.files[0];
    
    if (file && file.type === "application/json") {
        const reader = new FileReader();

        // Обработка успешного чтения файла
        reader.onload = function(e) {
            const content = e.target.result;
            try {
                const json = JSON.parse(content);
                console.log(json)
                //links.forEach(element => links.pop(element))
                //json.links.forEach(element => links.push(element))
                links = json.links.map(d => ({ ...d }));
                nodes = json.nodes.map(d => ({ ...d }));
                //nodes = json.nodes;
                //links = json.links;
                reRender();
                console.log("a")
                console.log(links)
                console.log("b")
            } catch (err) {
                console.log(err)
            }
        };

        reader.readAsText(file); // Чтение файла как текст
    } else {
    }
});



//DELETE LINK BUTTON
deleteLinkButton.addEventListener('click', async ()=>{
    console.log(tempLinkForEdit.source.id)
    console.log(links)
    links = links.filter(element => (element.source.id !== tempLinkForEdit.source.id)||(element.target.id !== tempLinkForEdit.target.id));
    console.log(links)
    editLinkCloseButton.click()
    statusFlag = statusFlagConstants.idle;
    setStatusText()
    reRender()
})

//REGISTER SUBMIT BUTTON
submitRegisterButton.addEventListener('click', async ()=>{
    let login = document.getElementById("signUpLoginInput").value
    let password = document.getElementById("signUpPasswordInput").value
    data = {login: login.toString(), password: password.toString()}
    let url = "http://127.0.0.1:8080/api/auth/register?"+ new URLSearchParams(data)
    const response = await fetch(url, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        //body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    let json = await response.json()
    //failed register
    if(json==null) document.getElementById("registerFormStatus").innerHTML = "user with this username already exists"
    //successful register
    else {
        document.getElementById("main").style.opacity = 1
        document.getElementById("top-menu").style.opacity = 1
        document.getElementById("registerFormStatus").innerHTML = ""
        document.getElementById("RegisterForm").style.display = "none"

    }
    await console.log(json)
})

function resetImpulseEditing(){
    impulseSteps = 0;
    currImpulseStep = 0;

    document.getElementById("impulseInputContainer").innerHTML = ""
    document.getElementById("impulseRemoveStepButton").style.visibility = "hidden"
    document.getElementById("impulseForNodeContainer").style.visibility = "hidden"
    document.getElementById("impulseSubmitButton").style.visibility = "hidden"
    document.getElementById("impulseAddStepButton").style.visibility = "visible"
    document.getElementById("doImpulseStepButton").style.visibility = "hidden"
    document.getElementById("impulseStepSpan").innerHTML = "номер текущего шага: 0"
    document.getElementById("impulseInputContainer").innerHTML = ""
    document.getElementById("impulseChartContainer").style.display = "none"
    document.getElementById("impulseStepSpan").innerHTML = ""
}

if(loggedUser==null) document.getElementById("networkSelect").style.display = "none";
if(loggedUser==null) document.getElementById("networkNameInputContainer").style.display = "none";
if(loggedUser==null) document.getElementById("returnEditNetworkButton").style.display = "none";
if(loggedUser==null) document.getElementById("openSelectedNetworkButton").style.display = "none";
if(loggedUser==null) document.getElementById("networkSaveButton").style.display = "none";

document.getElementById("rangeSlider").addEventListener('input', () => {
    let val = document.getElementById("rangeSlider").value
    console.log(val)
    nodeRadius = val
    reRender()
})




