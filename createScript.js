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
var isLayoutLocked = true

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

normalizeGraphNodes();
spreadInitialNodes();

function getNodeId(nodeOrId) {
    return typeof nodeOrId === "object" && nodeOrId !== null ? nodeOrId.id : nodeOrId;
}

function getLinkSourceId(link) {
    return getNodeId(link.source);
}

function getLinkTargetId(link) {
    return getNodeId(link.target);
}

function isKnownNodeRole(role) {
    return role === "target" || role === "resource" || role === "other";
}

function inferNodeRoleByName(node) {
    const targetNames = new Set([
        "РЈСЂРѕРІРµРЅСЊ Р·Р°РіСЂСЏР·РЅРµРЅРёСЏ",
        "РљР°С‡РµСЃС‚РІРѕ Р¶РёР·РЅРё",
        "РћС‚СЂР°РІР»СЏСЋС‰РёРµ РІРµС‰РµСЃС‚РІР°",
        "Р§РЎ",
        "Р Р€РЎР‚Р С•Р Р†Р ВµР Р…РЎРЉ Р В·Р В°Р С–РЎР‚РЎРЏР В·Р Р…Р ВµР Р…Р С‘РЎРЏ",
        "Р С™Р В°РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• Р В¶Р С‘Р В·Р Р…Р С‘",
        "Р С›РЎвЂљРЎР‚Р В°Р Р†Р В»РЎРЏРЎР‹РЎвЂ°Р С‘Р Вµ Р Р†Р ВµРЎвЂ°Р ВµРЎРѓРЎвЂљР Р†Р В°",
        "Р В§Р РЋ"
    ])

    const resourceNames = new Set([
        "Р¦РµРЅР° РєРІРѕС‚С‹",
        "Р”РѕРї. Р­РјРёСЃСЃРёСЏ",
        "РљРѕР»-РІРѕ Р°РІС‚Рѕ",
        "Р В¦Р ВµР Р…Р В° Р С”Р Р†Р С•РЎвЂљРЎвЂ№",
        "Р вЂќР С•Р С—. Р В­Р СР С‘РЎРѓРЎРѓР С‘РЎРЏ",
        "Р С™Р С•Р В»-Р Р†Р С• Р В°Р Р†РЎвЂљР С•"
    ])

    if (targetNames.has(node?.text)) return "target";
    if (resourceNames.has(node?.text)) return "resource";
    return "other";
}

function normalizeNodeRole(node) {
    const role = isKnownNodeRole(node?.role) ? node.role : inferNodeRoleByName(node);
    node.role = role;
    return node;
}

function normalizeGraphNodes() {
    nodes.forEach(normalizeNodeRole);
}

function serializeGraph() {
    return {
        nodes: nodes.map(node => ({ ...normalizeNodeRole({ ...node }), fx: null, fy: null })),
        links: links.map(link => ({
            source: getLinkSourceId(link),
            target: getLinkTargetId(link),
            value: Number(link.value),
            label: link.label ?? String(link.value)
        }))
    };
}

function getLinkColor(link) {
    return Number(link.value) > 0 ? "green" : "red";
}

function getLinkMarkerId(link) {
    return Number(link.value) > 0 ? "arrowhead-positive" : "arrowhead-negative";
}

function getNodeRoleStroke(node) {
    const role = getNodeChartRole(node)
    if (role === "target") return "#15803d"
    if (role === "resource") return "#b45309"
    return "rgba(15, 23, 42, 0.18)"
}

function getNodeRoleStrokeWidth(node) {
    const role = getNodeChartRole(node)
    if (role === "target" || role === "resource") return 2.2
    return 1
}

function spreadInitialNodes() {
    if (nodes.length < 2) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.34;
    const angleOffset = -Math.PI / 2;

    nodes.forEach((node, index) => {
        const angle = angleOffset + (2 * Math.PI * index) / nodes.length;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
        node.vx = 0;
        node.vy = 0;
        node.fx = null;
        node.fy = null;
    });
}

function fixNodePosition(node) {
    if (node.x == null) node.x = width / 2;
    if (node.y == null) node.y = height / 2;
    node.fx = node.x;
    node.fy = node.y;
}

function releaseNodePosition(node) {
    node.fx = null;
    node.fy = null;
}

function applyLayoutMode() {
    if (isLayoutLocked) {
        nodes.forEach(fixNodePosition);
        if (simulation) {
            simulation.alphaTarget(0).stop();
        }
        ticked();
        return;
    }

    nodes.forEach(releaseNodePosition);
    if (simulation) {
        simulation.alpha(0.6).restart();
    }
}

let maxNodeValue = 0
let minNodeValue = 0

function updateMinMaxNodeValue(){
    maxNodeValue = nodes.length ? Number(nodes[0].value) : 0
    minNodeValue = nodes.length ? Number(nodes[0].value) : 0
    nodes.forEach(element =>{
        let value = Number(element.value)
        if (value>maxNodeValue) maxNodeValue = value
        if (value<minNodeValue) minNodeValue = value
    })
}

let maxLinkValue = 0
let minLinkValue = 0

function updateMinMaxLinkValue(){
    maxLinkValue = links.length ? Number(links[0].value) : 0
    minLinkValue = links.length ? Number(links[0].value) : 0
    links.forEach(element =>{
        let value = Number(element.value)
        if (value>maxLinkValue) maxLinkValue = value
        if (value<minLinkValue) minLinkValue = value
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
const defs = svg.append("defs")

function createArrowMarker(id, markerColor) {
    defs.append("marker")
        .attr("id", id)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 35)
        .attr("refY", 5)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 Z")
        .attr("fill", markerColor)
}

createArrowMarker("arrowhead-positive", "green")
createArrowMarker("arrowhead-negative", "red")

/*
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
    .call(bindLinkEvents)
*/

// Добавляем линии для рёбер
var link = svg.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", getLinkColor)
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 2)
    .attr("marker-end", d => `url(#${getLinkMarkerId(d)})`)
    .call(bindLinkEvents)
; // Используем маркер стрелки

function updateLineView() {
    //console.log(links)
    link = link
        .data(links)
        .join(
            enter => enter.append("line")
            .attr("stroke", getLinkColor)
                .attr("stroke-width", 2)
                .attr("marker-end", d => `url(#${getLinkMarkerId(d)})`)
                .call(bindLinkEvents),// Инициализация новых элементов
            update => update.attr("stroke-width", 2)
                .attr("stroke", getLinkColor)
                .attr("marker-end", d => `url(#${getLinkMarkerId(d)})`), // Обновление существующих элементов
            exit => exit.remove() // Удаление вышедших элементов
        );
        console.log(nodes)
    //.join("line")
    //.attr("stroke-width", 2)
    //.attr("marker-end", "url(#arrowhead)"); // Убедитесь, что маркер стрелки обновляется
}

function bindNodeEvents(selection) {
    return selection
        .on("click", nodeClicked)
        .on("dblclick", nodeDoubleClicked);
}

function bindLinkEvents(selection) {
    return selection
        .on("click", editLink)
        .on("dblclick", linkDoubleClicked);
}

var node = svg.append("g")
    .selectAll()
    .data(nodes)
    .join("circle")
    .attr("r", nodeRadius)
    .attr("fill", d => color((d.value-minNodeValue)/(maxNodeValue-minNodeValue+1)))
    .attr("stroke", getNodeRoleStroke)
    .attr("stroke-width", getNodeRoleStrokeWidth)
    .call(bindNodeEvents);

function updateNodeView(){
    node = node
        .data(nodes)
        .join(
            enter => enter.append("circle").attr("r", 0)
                .attr("fill", d => {
                    console.log(d)
                    return color((d.value-minNodeValue)/(maxNodeValue-minNodeValue+1))
                }
                )
                .attr("stroke", getNodeRoleStroke)
                .attr("stroke-width", getNodeRoleStrokeWidth)
                .call(bindNodeEvents)
                .call(enter => enter.transition().attr("r", nodeRadius)),
            update => update.transition() // Добавляем переход для плавного обновления
                .attr("fill", d => color((d.value-minNodeValue)/(maxNodeValue-minNodeValue+1))) // Обновляем цвет для существующих узлов,
                .attr("stroke", getNodeRoleStroke)
                .attr("stroke-width", getNodeRoleStrokeWidth)
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
    .call(bindLinkEvents);

function updateLinkTextView(){
    linkText = linkText
        .data(links)
        .join("text")
        .attr("class", "link-text")
        .text(d => d.value)
        .call(bindLinkEvents);
}

// Добавляем группу для текста
var circlesText = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class", "circle-label")
    .each(function(d) {
        var words = d.text.split(' ');
        words.forEach((word, i) => {
            d3.select(this).append('tspan')
                .attr('x', d => d.x)
                .attr('dy', i == 0 ? '0em' : '1.0em')
                .text(word);
        });
    })
    .call(bindNodeEvents);

function updateCirclesTextView() {
    circlesText = circlesText
        .data(nodes)
        .join("text")
        .attr("class", "circle-label")
        .each(function(d) {
            // Очистка старых tspan элементов
            d3.select(this).selectAll('tspan').remove();
            var words = d.text.split(' ');
            words.forEach((word, i) => {
                d3.select(this).append('tspan')
                    .attr('x', d => d.x)
                    .attr('dy', i == 0 ? '0em' : '1.0em')
                    .text(word);
            });
        })
        .call(bindNodeEvents);
}

// Добавляем группу для текста
var circlesValueText = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("class", "circle-value")
    .text(d => d.value)
    .call(bindNodeEvents);

function updateCirclesValueTextView() {
    circlesValueText = circlesValueText
        .data(nodes)
        .join("text")
        .attr("class", "circle-value")
        .text(d => d.value)
        .call(bindNodeEvents);
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

applyLayoutMode()

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

    circlesText.attr("x", d => d.x)
        .attr("y", d => d.y-8);

    circlesText.selectAll('tspan')
        .attr('x', function() {
            return d3.select(this.parentNode).attr('x');
        });

    circlesValueText.attr("x", d => d.x - 10)
        .attr("y", d => d.y+18);
}

// Reheat the simulation when drag starts, and fix the subject position.
function dragstarted(event) {
    if (!event.active && !isLayoutLocked) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
}

// Update the subject (dragged node) position during drag.
function dragged(event) {
    event.subject.x = event.x;
    event.subject.y = event.y;
    event.subject.fx = event.x;
    event.subject.fy = event.y;
    if (isLayoutLocked) ticked();
}

// Restore the target alpha so the simulation cools after dragging ends.
// Unfix the subject position now that it’s no longer being dragged.
function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.x = event.x;
    event.subject.y = event.y;
    if (isLayoutLocked) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        ticked();
    } else {
        event.subject.fx = null;
        event.subject.fy = null;
    }
}

function editLink(event){
    if(statusFlag != statusFlagConstants.editNodeStarted) return
    console.log("hello")
    let tempLink = event.currentTarget.__data__
    openLinkEditor(tempLink)
}

function openLinkEditor(linkData) {
    tempLinkForEdit = linkData
    document.getElementById("editLinkValueInput").value = tempLinkForEdit.value
    document.getElementById("linkForm").style.display = "block"
}

function linkDoubleClicked(event) {
    event.preventDefault()
    event.stopPropagation()
    statusFlag = statusFlagConstants.idle
    setStatusText()
    openLinkEditor(event.currentTarget.__data__)
}

submitEditLinkButton.addEventListener("click", () => {
    const sourceId = getLinkSourceId(tempLinkForEdit)
    const targetId = getLinkTargetId(tempLinkForEdit)
    links.forEach(element => {
        if(getLinkSourceId(element) == sourceId && getLinkTargetId(element) == targetId){
            element.value = Number(document.getElementById("editLinkValueInput").value);
            element.label = String(element.value);
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
        spawn({ id: uuidv4(), group: 1, text:"New Node",  x: mouse.x, y: mouse.y , value: 1});
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
    links = links.filter(link => (getLinkSourceId(link) !== tempNodeForEdit.id) && (getLinkTargetId(link) !== tempNodeForEdit.id));
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
    setStatusText()
    document.getElementById("myForm").style.display = "none"
    reRender()
})

function nodeClicked(event) {
    const nodeData = event.currentTarget.__data__
    console.log(event)
    console.log(nodeData)
    console.log((nodeData.value-minNodeValue)/(maxNodeValue-minNodeValue+1))
    if (statusFlag == statusFlagConstants.addLinkStart) {
        firstNodeForLink = nodeData
        statusFlag = statusFlagConstants.addLinkFirstSelected
        setStatusText()
        console.log(nodeData)
        return
    }
    if (statusFlag == statusFlagConstants.addLinkFirstSelected) {
        secondNodeForLink = nodeData
        addNewLink()
        statusFlag = statusFlagConstants.idle
        setStatusText()
        return
    }
    if (statusFlag == statusFlagConstants.editNodeStarted) {
        openNodeEditor(nodeData)
        statusFlag = statusFlagConstants.idle
        setStatusText()
        return
    }

}

function openNodeEditor(nodeData) {
    tempNodeForEdit = nodeData
    document.getElementById("editNodeNameInput").value = nodeData.text
    document.getElementById("editNodeValueInput").value = nodeData.value
    document.getElementById("editNodeRoleSelect").value = getNodeChartRole(nodeData)
    openForm()
}

function nodeDoubleClicked(event) {
    event.preventDefault()
    event.stopPropagation()
    statusFlag = statusFlagConstants.idle
    setStatusText()
    openNodeEditor(event.currentTarget.__data__)
}

function mousemoved(event) {
    const [x, y] = d3.pointer(event);
    mouse = { x, y };
    if (!isLayoutLocked) {
        simulation.alpha(0.3).restart();
    }
}

function spawn(source) {
    normalizeNodeRole(source)
    if (isLayoutLocked) {
        fixNodePosition(source)
    }
    nodes.push(source);

    reRender()
}

function reRender() {
    console.log("rerender!!!")
    normalizeGraphNodes()
    links.forEach(link => {
        link.source = nodes.find(node => node.id === getLinkSourceId(link)) || link.source;
        link.target = nodes.find(node => node.id === getLinkTargetId(link)) || link.target;
    });
    updateMinMaxNodeValue()
    updateMinMaxLinkValue()

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
    if (isLayoutLocked) {
        nodes.forEach(fixNodePosition)
        simulation.alphaTarget(0).stop();
        ticked()
    } else {
        nodes.forEach(releaseNodePosition)
        simulation.alpha(1).restart();
    }

    svg.property("value", {
        nodes: nodes.map(d => ({ id: d.index })),
        links: links.map(d => ({
            source: nodes.findIndex(node => node.id === getLinkSourceId(d)),
            target: nodes.findIndex(node => node.id === getLinkTargetId(d))
        }))
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
            const impulseValue = Number(document.getElementById(id).value)
            if(!Number.isFinite(impulseValue)) {row.push(0)}
            else{
                row.push(impulseValue);}
        }
        impulseMatrix.push(row);
    }
    if(impulseSteps>0){
        if (document.getElementById("impulseRemoveStepButton")) document.getElementById("impulseRemoveStepButton").style.visibility = "hidden"
        document.getElementById("impulseForNodeContainer").style.visibility = "hidden"
        document.getElementById("impulseSubmitButton").style.visibility = "hidden"
        if (document.getElementById("impulseAddStepButton")) document.getElementById("impulseAddStepButton").style.visibility = "hidden"
        document.getElementById("doImpuleStepContainer").style.visibility = "visible"
        document.getElementById("doImpulseStepButton").style.visibility = "visible"
    }

    console.log(impulseMatrix)
});

//IMPULSE STEPS ADD BUTTON
if (document.getElementById("impulseAddStepButton")) document.getElementById("impulseAddStepButton").addEventListener('click', () => {
    setImpulseSteps(impulseSteps + 1)
});

var selectedImpulseNodesIds = []

function updateImpulseControlsVisibility() {
    const hasSteps = impulseSteps > 0
    if (document.getElementById("impulseRemoveStepButton")) document.getElementById("impulseRemoveStepButton").style.visibility = hasSteps ? "visible" : "hidden"
    document.getElementById("impulseForNodeContainer").style.visibility = hasSteps ? "visible" : "hidden"
    document.getElementById("impulseSubmitButton").style.visibility = hasSteps ? "visible" : "hidden"
    if (!hasSteps) {
        document.getElementById("doImpuleStepContainer").style.visibility = "hidden"
        document.getElementById("doImpulseStepButton").style.visibility = "hidden"
    }
}

function showSelectedImpulseRows() {
    selectedImpulseNodesIds.forEach(element => {
        let row = document.getElementById("impulseRow:"+element)
        if (row) row.style.display = "flex"
    })
}

function getImpulseInputValues(rowCount, columnCount) {
    const values = []
    for (let i = 0; i < rowCount; i++) {
        values[i] = []
        for (let j = 0; j < columnCount; j++) {
            const input = document.getElementById("impulseInput:"+i+"-"+j)
            values[i][j] = input ? input.value : ""
        }
    }
    return values
}

function restoreImpulseInputValues(values) {
    for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[i].length; j++) {
            const input = document.getElementById("impulseInput:"+i+"-"+j)
            if (input) input.value = values[i][j]
        }
    }
}

function setImpulseSteps(nextSteps) {
    const previousValues = getImpulseInputValues(nodes.length, impulseSteps)

    impulseSteps = Math.max(0, Number.parseInt(nextSteps) || 0)
    document.getElementById("impulseStepsInput").value = impulseSteps
    document.getElementById("totalImpulseStepsSpan").innerHTML = "Количество шагов: "+impulseSteps;

    if (impulseSteps == 0) {
        document.getElementById("impulseInputContainer").innerHTML = ""
        updateImpulseControlsVisibility()
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
    createMatrixInput("impulse", "impulseInputContainer", nodes.length, impulseSteps, rowHeaders, columnHeaders)
    restoreImpulseInputValues(previousValues)
    showSelectedImpulseRows()
    updateImpulseControlsVisibility()
}

//IMPULSE STEPS REMOVE BUTTON
if (document.getElementById("impulseRemoveStepButton")) document.getElementById("impulseRemoveStepButton").addEventListener('click', () => {
    if(impulseSteps!=0) setImpulseSteps(impulseSteps - 1)
});

document.getElementById("impulseStepsInput").addEventListener('change', (event) => {
    setImpulseSteps(event.target.value)
})

document.getElementById("impulseStepsInput").addEventListener('keydown', (event) => {
    if (event.key === "Enter") {
        event.currentTarget.blur()
    }
})

function updateChartRangeFromInput(event) {
    if (event?.key && event.key !== "Enter") return
    renderImpulseChart()
}

document.getElementById("chartStepFromInput").addEventListener('change', renderImpulseChart)
document.getElementById("chartStepToInput").addEventListener('change', renderImpulseChart)
document.getElementById("chartStepFromInput").addEventListener('keydown', updateChartRangeFromInput)
document.getElementById("chartStepToInput").addEventListener('keydown', updateChartRangeFromInput)

controlProgramButton.addEventListener('click', openControlProgramForm)
controlProgramCloseButton.addEventListener('click', closeControlProgramForm)
applyControlProgramButton.addEventListener('click', applyControlProgram)
controlProgramManualModeInput.addEventListener('change', updateControlProgramModeView)
controlAcceptanceAcceptButton.addEventListener('click', () => {
    controlProgramAcceptanceDecision = "accepted"
    renderControlAcceptanceActions()
    renderControlAcceptanceWindow("Программа принята. Теперь результат можно сохранить.")
})
controlAcceptanceRejectButton.addEventListener('click', () => {
    controlProgramAcceptanceDecision = "rejected"
    renderControlAcceptanceActions()
    renderControlAcceptanceWindow("Программа не принята. Можно выполнить перерасчет или выйти.")
})
controlAcceptanceCloseButton.addEventListener('click', closeControlAcceptanceWindow)
controlAcceptanceSaveFileButton.addEventListener('click', saveAcceptedControlProgramToFile)
controlAcceptanceSaveImageButton.addEventListener('click', saveCurrentProgramImage)
controlAcceptanceRecalculateButton.addEventListener('click', () => {
    if (!recalculateControlProgram(3)) return
    controlProgramAutoRecalculated = true
    controlProgramAcceptanceDecision = null
    runAllImpulseStepsWithoutAcceptance()
    renderControlProgramResult()
    renderControlAcceptanceWindow()
})

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
    if(loggedUser == null) return;
    let jsonNetwork = serializeGraph()
    let data = {
        name: document.getElementById("networkNameInput").value,
        userId: loggedUser.id,
        networkJson: JSON.stringify(jsonNetwork)
    }
    console.log(data)
    {
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
        if(network!=null) {
            nodes = network.nodes.map(d => ({ ...d }));
            links = network.links.map(d => ({ ...d }));
            reRender();
            console.log(links)
        }
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
            element.value = Number(document.getElementById("editNodeValueInput").value)
            element.role = document.getElementById("editNodeRoleSelect").value
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
        let node1 = nodesMap.get(getLinkSourceId(element))
        let node2 = nodesMap.get(getLinkTargetId(element))

        if (!node1 || !node2) return
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
var selectedChartNodeIds = new Set();
var chartNodeFilterInitialized = false;
var isChartNodeFilterOpen = false;
var lastControlProgramCheck = null;
var lastControlProgramSearch = null;
var lastControlProgramVerification = null;
var controlProgramAutoRecalculated = false;
var controlProgramAcceptanceDecision = null;

function getNodeNamesForChart() {
    let nodeNames = [];
    for (let i=0;i<nodes.length;i++){
        nodeNames.push(nodesNumberNodeMap.get(i).text)
    }
    return nodeNames
}

function getNodeChartRole(node) {
    if (isKnownNodeRole(node?.role)) return node.role
    const targetNames = new Set([
        "Уровень загрязнения",
        "Качество жизни",
        "Отравляющие вещества",
        "ЧС",
        "РЈСЂРѕРІРµРЅСЊ Р·Р°РіСЂСЏР·РЅРµРЅРёСЏ",
        "РљР°С‡РµСЃС‚РІРѕ Р¶РёР·РЅРё",
        "РћС‚СЂР°РІР»СЏСЋС‰РёРµ РІРµС‰РµСЃС‚РІР°",
        "Р§РЎ"
    ])

    const resourceNames = new Set([
        "Цена квоты",
        "Доп. Эмиссия",
        "Кол-во авто",
        "Р¦РµРЅР° РєРІРѕС‚С‹",
        "Р”РѕРї. Р­РјРёСЃСЃРёСЏ",
        "РљРѕР»-РІРѕ Р°РІС‚Рѕ"
    ])

    if (targetNames.has(node?.text)) return "target"
    if (resourceNames.has(node?.text)) return "resource"
    return "other"
}

function getNodeChartRoles() {
    const roles = []
    for (let i=0;i<nodes.length;i++){
        roles.push(getNodeChartRole(nodesNumberNodeMap.get(i)))
    }
    return roles
}

function getRoleName(role) {
    if (role === "target") return "цель"
    if (role === "resource") return "ресурс"
    return "прочее"
}

function getDefaultTargetDirection(node) {
    const positiveTargetNames = new Set([
        "Качество жизни",
        "РљР°С‡РµСЃС‚РІРѕ Р¶РёР·РЅРё"
    ])

    if (positiveTargetNames.has(node?.text)) return 1
    if (getNodeChartRole(node) === "target") return -1
    return 1
}

function parseControlSteps(rawValue, fallbackSteps) {
    const fallback = Array.from({ length: fallbackSteps }, (_, index) => index + 1)
    if (!rawValue || !rawValue.trim()) return fallback

    const steps = new Set()
    rawValue
        .split(/[,\s;]+/)
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(part => {
            const rangeMatch = part.match(/^(\d+)-(\d+)$/)
            if (rangeMatch) {
                const start = Number.parseInt(rangeMatch[1])
                const end = Number.parseInt(rangeMatch[2])
                const from = Math.min(start, end)
                const to = Math.max(start, end)
                for (let step = from; step <= to; step++) steps.add(step)
                return
            }

            const step = Number.parseInt(part)
            if (step > 0) steps.add(step)
        })

    return [...steps].sort((a, b) => a - b)
}

function renderControlProgramForm() {
    fillNodeAndLinkMaps()

    const targetList = document.getElementById("controlTargetList")
    const resourceList = document.getElementById("controlResourceList")
    targetList.innerHTML = ""
    resourceList.innerHTML = ""

    const targetHeader = document.createElement("div")
    targetHeader.className = "control-program-list-header control-program-target-item"
    targetHeader.innerHTML = "<span></span><span>Вершина</span><span>Динамика</span>"
    targetList.appendChild(targetHeader)

    const resourceHeader = document.createElement("div")
    resourceHeader.className = "control-program-list-header control-program-resource-item"
    resourceHeader.innerHTML = "<span></span><span>Вершина</span><span>Шаги</span>"
    resourceList.appendChild(resourceHeader)

    const defaultSteps = Math.max(impulseSteps || 10, 1)
    document.getElementById("targetDynamicFromStepInput").value = 1
    document.getElementById("targetDynamicToStepInput").value = defaultSteps
    document.getElementById("controlProgramManualModeInput").checked = false

    nodes.forEach((node, index) => {
        const role = getNodeChartRole(node)
        const defaultDirection = getDefaultTargetDirection(node)

        const targetItem = document.createElement("label")
        targetItem.className = "control-program-item"
        targetItem.innerHTML = `
            <input class="control-target-checkbox" type="checkbox" data-node-index="${index}" ${role === "target" ? "checked" : ""}>
            <span class="control-program-item-name" title="${node.text}">${node.text}</span>
            <select class="control-target-direction" data-node-index="${index}">
                <option value="1" ${defaultDirection === 1 ? "selected" : ""}>рост</option>
                <option value="-1" ${defaultDirection === -1 ? "selected" : ""}>снижение</option>
            </select>
            <span class="chart-node-role-badge chart-node-role-${role}">${getRoleName(role)}</span>
        `
        targetList.appendChild(targetItem)

        const resourceItem = document.createElement("label")
        resourceItem.className = "control-program-item"
        resourceItem.innerHTML = `
            <input class="control-resource-checkbox" type="checkbox" data-node-index="${index}" ${role === "resource" ? "checked" : ""}>
            <span class="control-program-item-name" title="${node.text}">${node.text}</span>
            <input class="control-resource-steps" type="text" data-node-index="${index}" value="1-${defaultSteps}" title="Например: 1-5 или 1, 3, 5">
            <span class="chart-node-role-badge chart-node-role-${role}">${getRoleName(role)}</span>
        `
        resourceList.appendChild(resourceItem)
    })

    targetList.querySelectorAll(".control-program-item").forEach(item => {
        if (!item.querySelector(".chart-node-role-target")) item.remove()
        else {
            item.classList.add("control-program-target-item")
            const roleBadge = item.querySelector(".chart-node-role-badge")
            if (roleBadge) roleBadge.remove()
        }
    })
    resourceList.querySelectorAll(".control-program-item").forEach(item => {
        if (!item.querySelector(".chart-node-role-resource")) item.remove()
        else item.classList.add("control-program-resource-item")
    })
    resourceList.querySelectorAll(".control-program-item .chart-node-role-badge").forEach(roleBadge => roleBadge.remove())

    if (!targetList.querySelector(".control-program-item")) {
        targetList.textContent = "Целевые вершины не найдены."
    }
    if (!resourceList.querySelector(".control-program-item")) {
        resourceList.textContent = "Ресурсные вершины не найдены."
    }

    updateControlProgramModeView()
}

function updateControlProgramModeView() {
    const manualMode = document.getElementById("controlProgramManualModeInput")?.checked || false
    const applyButton = document.getElementById("applyControlProgramButton")
    if (applyButton) applyButton.textContent = manualMode ? "Открыть ручной ввод" : "Подставить автоматически"
    document.getElementById("controlProgramStatus").textContent = manualMode
        ? "Ручной режим: будет создана таблица импульсов, значения нужно будет ввести самостоятельно."
        : "Автоматический режим: программа подберет целые импульсы от -10 до 10."
}

function openControlProgramForm() {
    renderControlProgramForm()
    document.getElementById("controlProgramForm").style.display = "block"
    document.getElementById("main").style.opacity = 0.45
}

function closeControlProgramForm() {
    document.getElementById("controlProgramForm").style.display = "none"
    document.getElementById("main").style.opacity = 1
}

function getControlProgramSelections() {
    const rawTargetFromStep = Number.parseInt(document.getElementById("targetDynamicFromStepInput").value) || 1
    const rawTargetToStep = Number.parseInt(document.getElementById("targetDynamicToStepInput").value) || rawTargetFromStep
    const targetFromStep = Math.max(1, Math.min(rawTargetFromStep, rawTargetToStep))
    const targetToStep = Math.max(targetFromStep, rawTargetFromStep, rawTargetToStep)
    document.getElementById("targetDynamicFromStepInput").value = targetFromStep
    document.getElementById("targetDynamicToStepInput").value = targetToStep
    const targets = [...document.querySelectorAll(".control-target-checkbox")]
        .filter(input => input.checked)
        .map(input => {
            const index = Number.parseInt(input.dataset.nodeIndex)
            const direction = Number(document.querySelector(`.control-target-direction[data-node-index="${index}"]`).value)
            return { index, direction }
        })

    const resources = [...document.querySelectorAll(".control-resource-checkbox")]
        .filter(input => input.checked)
        .map(input => {
            const index = Number.parseInt(input.dataset.nodeIndex)
            const rawSteps = document.querySelector(`.control-resource-steps[data-node-index="${index}"]`).value
            return {
                index,
                steps: parseControlSteps(rawSteps, targetToStep),
                strength: 1
            }
        })
        .filter(resource => resource.steps.length)

    const manualMode = document.getElementById("controlProgramManualModeInput")?.checked || false
    return { targetFromStep, targetToStep, targets, resources, manualMode }
}

function clearImpulseInputs() {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < impulseSteps; j++) {
            const input = document.getElementById("impulseInput:"+i+"-"+j)
            if (input) input.value = 0
        }
    }
}

function getBaseNodeColumn() {
    fillNodeAndLinkMaps()
    return nodes.map(node => [Number(node.value)])
}

function calculateImpulseResultValues(candidateImpulseMatrix, totalSteps) {
    fillNodeMatrix()
    const calculationMatrix = transpose(nodeMatrix)
    const baseColumn = getBaseNodeColumn()
    const resultValues = nodes.map(() => [])

    for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
        let resultColumn
        if (stepIndex === 0) {
            resultColumn = addMatrices(baseColumn, getColumnMatrix(candidateImpulseMatrix, 0))
        } else {
            resultColumn = getColumnMatrix(resultValues, stepIndex - 1)
            for (let impulseIndex = 0; impulseIndex <= stepIndex; impulseIndex++) {
                const matrixPowerValue = matrixPower(calculationMatrix, stepIndex - impulseIndex)
                const impulseContribution = multiplyMatrices(matrixPowerValue, getColumnMatrix(candidateImpulseMatrix, impulseIndex))
                resultColumn = addMatrices(resultColumn, impulseContribution)
            }
        }

        resultColumn.forEach((row, nodeIndex) => {
            resultValues[nodeIndex].push(row[0])
        })
    }

    return resultValues
}

function getControlProgramStepValue(resultValues, nodeIndex, step, fallbackValue) {
    const value = resultValues[nodeIndex]?.[step - 1]
    return Number.isFinite(Number(value)) ? Number(value) : fallbackValue
}

function evaluateControlProgram(candidateImpulseMatrix, targets, targetFromStep, targetToStep, totalSteps) {
    const resultValues = calculateImpulseResultValues(candidateImpulseMatrix, totalSteps)
    const fromStep = Math.min(targetFromStep, totalSteps)
    const toStep = Math.min(targetToStep, totalSteps)
    let achievedCount = 0
    let directionScore = 0

    targets.forEach(target => {
        const fallbackValue = Number(nodesNumberNodeMap.get(target.index)?.value ?? 0)
        const startValue = getControlProgramStepValue(resultValues, target.index, fromStep, fallbackValue)
        const endValue = getControlProgramStepValue(resultValues, target.index, toStep, startValue)
        const directedDelta = (endValue - startValue) * target.direction
        if (directedDelta > 0) achievedCount++
        directionScore += directedDelta
    })

    return { achievedCount, directionScore, resultValues }
}

function isControlProgramScoreBetter(candidateScore, bestScore) {
    if (!bestScore) return true
    if (candidateScore.achievedCount !== bestScore.achievedCount) {
        return candidateScore.achievedCount > bestScore.achievedCount
    }
    return candidateScore.directionScore > bestScore.directionScore
}

function getControlProgramVariables(resources, totalSteps) {
    const variables = []
    resources.forEach(resource => {
        resource.steps.forEach(step => {
            const columnIndex = step - 1
            if (columnIndex >= 0 && columnIndex < totalSteps) {
                variables.push({ nodeIndex: resource.index, columnIndex, magnitude: 10 })
            }
        })
    })
    return variables
}

function getControlProgramTargetDelta(resultValues, target, fromStep, toStep) {
    const fallbackValue = Number(nodesNumberNodeMap.get(target.index)?.value ?? 0)
    const startValue = getControlProgramStepValue(resultValues, target.index, fromStep, fallbackValue)
    const endValue = getControlProgramStepValue(resultValues, target.index, toStep, startValue)
    return endValue - startValue
}

function solveLinearSystem(matrix, vector) {
    const size = vector.length
    const augmented = matrix.map((row, index) => [...row, vector[index]])

    for (let column = 0; column < size; column++) {
        let pivotRow = column
        for (let row = column + 1; row < size; row++) {
            if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
                pivotRow = row
            }
        }

        if (Math.abs(augmented[pivotRow][column]) < 1e-9) continue
        if (pivotRow !== column) {
            const temp = augmented[column]
            augmented[column] = augmented[pivotRow]
            augmented[pivotRow] = temp
        }

        const pivot = augmented[column][column]
        for (let col = column; col <= size; col++) augmented[column][col] /= pivot

        for (let row = 0; row < size; row++) {
            if (row === column) continue
            const factor = augmented[row][column]
            for (let col = column; col <= size; col++) {
                augmented[row][col] -= factor * augmented[column][col]
            }
        }
    }

    return augmented.map(row => Number.isFinite(row[size]) ? row[size] : 0)
}

function solveRidgeLeastSquares(influenceMatrix, targetVector, variables, options = {}) {
    const variableCount = variables.length
    const targetCount = targetVector.length
    if (!variableCount) return []

    const regularization = Number(options.regularization) || 0.35
    const normalMatrix = Array.from({ length: variableCount }, () => Array(variableCount).fill(0))
    const normalVector = Array(variableCount).fill(0)

    for (let i = 0; i < variableCount; i++) {
        for (let targetIndex = 0; targetIndex < targetCount; targetIndex++) {
            const influence = influenceMatrix[targetIndex][i]
            normalVector[i] += influence * targetVector[targetIndex]
            for (let j = 0; j < variableCount; j++) {
                normalMatrix[i][j] += influence * influenceMatrix[targetIndex][j]
            }
        }
        const magnitude = Math.max(0.001, variables[i].magnitude)
        normalMatrix[i][i] += regularization / (magnitude * magnitude)
    }

    return solveLinearSystem(normalMatrix, normalVector)
}

function createControlMatrixFromVector(solution, variables, totalSteps, multiplier = 1, limitMultiplier = 1.5) {
    const candidateMatrix = nodes.map(() => Array(totalSteps).fill(0))
    variables.forEach((variable, index) => {
        const limit = variable.magnitude * limitMultiplier
        const rawValue = (Number(solution[index]) || 0) * multiplier
        const value = clamp(rawValue, -limit, limit)
        candidateMatrix[variable.nodeIndex][variable.columnIndex] = Math.abs(value) < 1e-6 ? 0 : Number(value.toFixed(3))
    })
    return candidateMatrix
}

function getControlMatrixNorm(impulseMatrix) {
    let sum = 0
    impulseMatrix.forEach(row => row.forEach(value => {
        sum += Number(value) * Number(value)
    }))
    return Math.sqrt(sum)
}

function getControlProgramDesiredDeltas(zeroScore, targets, fromStep, toStep) {
    return targets.map(target => {
        const fallbackValue = Number(nodesNumberNodeMap.get(target.index)?.value ?? 0)
        const startValue = getControlProgramStepValue(zeroScore.resultValues, target.index, fromStep, fallbackValue)
        const endValue = getControlProgramStepValue(zeroScore.resultValues, target.index, toStep, startValue)
        const baselineDelta = endValue - startValue
        const scale = Math.max(1, Math.abs(startValue), Math.abs(endValue))
        const desiredDirectedDelta = Math.max(1, Math.round(scale * 0.08))
        const baselineDirectedDelta = baselineDelta * target.direction
        if (baselineDirectedDelta > 0) return baselineDelta
        return target.direction * desiredDirectedDelta
    })
}

function scoreIntegerControlProgram(score, targets, targetFromStep, targetToStep, totalSteps, impulseMatrix, desiredDeltas) {
    const fromStep = Math.min(targetFromStep, totalSteps)
    const toStep = Math.min(targetToStep, totalSteps)
    let objective = 0
    let achievedCount = 0
    let directionScore = 0

    targets.forEach((target, index) => {
        const delta = getControlProgramTargetDelta(score.resultValues, target, fromStep, toStep)
        const directedDelta = delta * target.direction
        const desiredDirectedDelta = desiredDeltas[index] * target.direction
        if (directedDelta > 0) achievedCount++
        directionScore += directedDelta

        const underShoot = Math.max(0, desiredDirectedDelta - directedDelta)
        const overShoot = Math.max(0, directedDelta - desiredDirectedDelta)
        objective += directedDelta > 0 ? 140 : -140
        objective -= underShoot * 18
        objective -= overShoot * 4
    })

    const norm = getControlMatrixNorm(impulseMatrix)
    const signedStepTotals = Array(totalSteps).fill(0)
    let activeCount = 0
    impulseMatrix.forEach(row => row.forEach((value, stepIndex) => {
        if (value !== 0) activeCount++
        signedStepTotals[stepIndex] += value
    }))
    const directionBias = signedStepTotals.reduce((sum, value) => sum + Math.abs(value), 0)
    objective -= norm * 0.8
    objective -= directionBias * 0.35
    objective -= activeCount * 0.25

    return { ...score, achievedCount, directionScore, objective, resourceNorm: norm }
}

function isIntegerControlScoreBetter(candidate, current) {
    if (!current) return true
    if (candidate.achievedCount !== current.achievedCount) return candidate.achievedCount > current.achievedCount
    return candidate.objective > current.objective
}

function getIntegerCandidateValues(currentValue) {
    const values = new Set([currentValue, 0, -10, -7, -5, -3, -2, -1, 1, 2, 3, 5, 7, 10])
    for (let value = -10; value <= 10; value++) values.add(value)
    return [...values]
}

function findIntegerControlProgram(targets, resources, totalSteps, targetFromStep, targetToStep, options = {}) {
    const variables = getControlProgramVariables(resources, totalSteps)
    const candidateMatrix = nodes.map(() => Array(totalSteps).fill(0))
    const zeroScore = evaluateControlProgram(candidateMatrix, targets, targetFromStep, targetToStep, totalSteps)
    const fromStep = Math.min(targetFromStep, totalSteps)
    const toStep = Math.min(targetToStep, totalSteps)
    const desiredDeltas = getControlProgramDesiredDeltas(zeroScore, targets, fromStep, toStep)
    if (!variables.length || zeroScore.achievedCount === targets.length) {
        return { impulseMatrix: candidateMatrix, score: scoreIntegerControlProgram(zeroScore, targets, targetFromStep, targetToStep, totalSteps, candidateMatrix, desiredDeltas) }
    }

    const baselineDeltas = targets.map(target => getControlProgramTargetDelta(zeroScore.resultValues, target, fromStep, toStep))
    const targetVector = desiredDeltas.map((desiredDelta, index) => desiredDelta - baselineDeltas[index])

    const influenceMatrix = targets.map(() => [])
    variables.forEach((variable, variableIndex) => {
        const unitMatrix = nodes.map(() => Array(totalSteps).fill(0))
        unitMatrix[variable.nodeIndex][variable.columnIndex] = 1
        const unitValues = calculateImpulseResultValues(unitMatrix, totalSteps)
        targets.forEach((target, targetIndex) => {
            const unitDelta = getControlProgramTargetDelta(unitValues, target, fromStep, toStep)
            influenceMatrix[targetIndex][variableIndex] = unitDelta - baselineDeltas[targetIndex]
        })
    })

    const solution = solveRidgeLeastSquares(influenceMatrix, targetVector, variables, {
        regularization: options.regularization || 0.08
    })
    const multipliers = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5]
    let bestMatrix = candidateMatrix.map(row => [...row])
    let bestScore = scoreIntegerControlProgram(zeroScore, targets, targetFromStep, targetToStep, totalSteps, bestMatrix, desiredDeltas)

    multipliers.forEach(multiplier => {
        const matrix = nodes.map(() => Array(totalSteps).fill(0))
        variables.forEach((variable, index) => {
            matrix[variable.nodeIndex][variable.columnIndex] = clamp(Math.round((Number(solution[index]) || 0) * multiplier), -10, 10)
        })
        const score = evaluateControlProgram(matrix, targets, targetFromStep, targetToStep, totalSteps)
        const scored = scoreIntegerControlProgram(score, targets, targetFromStep, targetToStep, totalSteps, matrix, desiredDeltas)
        if (isIntegerControlScoreBetter(scored, bestScore)) {
            bestMatrix = matrix
            bestScore = scored
        }
    })

    let improved = true
    let passes = 0
    const maxPasses = Math.max(1, Number(options.maxPasses) || 5)
    while (improved && passes < maxPasses) {
        improved = false
        passes++
        variables.forEach(variable => {
            const currentValue = bestMatrix[variable.nodeIndex][variable.columnIndex]
            let localBestValue = currentValue
            let localBestScore = bestScore

            getIntegerCandidateValues(currentValue).forEach(value => {
                if (value === currentValue) return
                const matrix = bestMatrix.map(row => [...row])
                matrix[variable.nodeIndex][variable.columnIndex] = value
                const score = evaluateControlProgram(matrix, targets, targetFromStep, targetToStep, totalSteps)
                const scored = scoreIntegerControlProgram(score, targets, targetFromStep, targetToStep, totalSteps, matrix, desiredDeltas)
                if (isIntegerControlScoreBetter(scored, localBestScore)) {
                    localBestValue = value
                    localBestScore = scored
                }
            })

            if (localBestValue !== currentValue) {
                bestMatrix[variable.nodeIndex][variable.columnIndex] = localBestValue
                bestScore = localBestScore
                improved = true
            }
        })
    }

    return { impulseMatrix: bestMatrix, score: bestScore }
}

function findControlProgram(targets, resources, totalSteps, targetFromStep, targetToStep, options = {}) {
    return findIntegerControlProgram(targets, resources, totalSteps, targetFromStep, targetToStep, options)
}

function getControlProgramVerification() {
    if (!lastControlProgramCheck || !resValues.length || !resValues[0]?.length) return null

    const fromStep = Math.min(lastControlProgramCheck.targetFromStep, resValues[0].length)
    const toStep = Math.min(lastControlProgramCheck.targetToStep, resValues[0].length)
    let achievedCount = 0
    const rows = lastControlProgramCheck.targets.map(target => {
        const node = nodesNumberNodeMap.get(target.index)
        const values = resValues[target.index] || []
        const fallbackValue = Number(nodesNumberNodeMap.get(target.index)?.value ?? 0)
        const startValue = Number.isFinite(Number(values[fromStep - 1])) ? Number(values[fromStep - 1]) : fallbackValue
        const endValue = Number.isFinite(Number(values[toStep - 1])) ? Number(values[toStep - 1]) : startValue
        const delta = Number(endValue) - Number(startValue)
        const achieved = target.direction > 0 ? delta > 0 : delta < 0
        if (achieved) achievedCount++

        return {
            nodeName: node?.text ?? "Вершина",
            direction: target.direction,
            directionText: target.direction > 0 ? "рост" : "снижение",
            startValue,
            endValue,
            delta,
            achieved
        }
    })

    return {
        fromStep,
        toStep,
        rows,
        achievedCount,
        totalTargets: lastControlProgramCheck.targets.length,
        allAchieved: achievedCount === lastControlProgramCheck.targets.length
    }
}

function renderControlProgramResult() {
    const container = document.getElementById("controlProgramResult")
    if (!container) return

    if (!lastControlProgramCheck) {
        lastControlProgramVerification = null
        container.innerHTML = ""
        return
    }

    if (!resValues.length || !resValues[0]?.length) {
        lastControlProgramVerification = null
        container.innerHTML = `
            <div class="control-program-result-title">Проверка программы управления</div>
            <div class="control-program-result-note">Проверка появится после выполнения шагов.</div>
        `
        return
    }

    const verification = getControlProgramVerification()
    lastControlProgramVerification = verification
    const fromStep = verification.fromStep
    const toStep = verification.toStep
    const formatResultNumber = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "-"
    const rows = verification.rows.map(row => {
        const statusText = row.achieved ? "достигнуто" : "не достигнуто"
        const statusClass = row.achieved ? "control-program-result-ok" : "control-program-result-fail"

        return `
            <tr class="${statusClass}">
                <td class="control-program-result-name" title="${row.nodeName}">${row.nodeName}</td>
                <td>${row.directionText}</td>
                <td>${formatResultNumber(row.startValue)}</td>
                <td>${formatResultNumber(row.endValue)}</td>
                <td>${formatResultNumber(row.delta)}</td>
                <td>${statusText}</td>
            </tr>
        `
    }).join("")
    const summaryClass = verification.allAchieved ? "control-program-summary-ok" : "control-program-summary-fail"
    const summaryText = verification.allAchieved
        ? `Программа управления найдена: все цели достигнуты (${verification.achievedCount}/${verification.totalTargets}).`
        : `Программа управления не найдена полностью: достигнуто ${verification.achievedCount}/${verification.totalTargets} целей.`

    container.innerHTML = `
        <div class="control-program-result-title">Проверка программы управления, шаги ${fromStep}-${toStep}</div>
        <div class="control-program-summary ${summaryClass}">${summaryText}</div>
        <div class="control-program-result-note">Проверка выполнена прямым расчетом модели: найденные импульсы подставлены в исходную модель, затем результат на выбранном отрезке сравнен с заданной тенденцией.</div>
        <table class="control-program-result-table">
            <thead>
                <tr>
                    <th>Цель</th>
                    <th>Требуется</th>
                    <th>Шаг ${fromStep}</th>
                    <th>Шаг ${toStep}</th>
                    <th>Δ</th>
                    <th>Итог</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `
}

function applyControlProgram() {
    const { targetFromStep, targetToStep, targets, resources, manualMode } = getControlProgramSelections()

    if (!targets.length) {
        document.getElementById("controlProgramStatus").textContent = "Нужно выбрать хотя бы одну целевую вершину."
        return
    }

    if (!resources.length) {
        document.getElementById("controlProgramStatus").textContent = "Нужно выбрать хотя бы одну ресурсную вершину."
        return
    }

    const maxControlStep = Math.max(...resources.flatMap(resource => resource.steps))
    const totalSteps = Math.max(targetToStep, maxControlStep)
    setImpulseSteps(totalSteps)
    clearImpulseInputs()
    currImpulseStep = 0
    resValues = []
    lastControlProgramCheck = {
        targetFromStep,
        targetToStep,
        targets: targets.map(target => ({ ...target }))
    }
    lastControlProgramSearch = {
        targetFromStep,
        targetToStep,
        resources: resources.map(resource => ({ ...resource, steps: [...resource.steps] })),
        totalSteps,
        maxControlStep,
        manualMode
    }
    controlProgramAutoRecalculated = false
    document.getElementById("impulseStepSpan").innerHTML = ""
    document.getElementById("impulseChartContainer").style.display = "none"
    renderControlProgramResult()

    selectedImpulseNodesIds = [...new Set(resources.map(resource => resource.index))]
    showSelectedImpulseRows()

    let searchResult = null
    if (manualMode) {
        putControlProgramMatrixToInputs(nodes.map(() => Array(totalSteps).fill(0)))
    } else {
        searchResult = findControlProgram(targets, resources, totalSteps, targetFromStep, targetToStep)
        putControlProgramMatrixToInputs(searchResult.impulseMatrix)
    }

    document.getElementById("chartStepFromInput").value = targetFromStep
    document.getElementById("chartStepToInput").value = targetToStep
    updateImpulseControlsVisibility()
    document.getElementById("impulseSubmitButton").style.visibility = "hidden"
    document.getElementById("doImpuleStepContainer").style.visibility = "visible"
    document.getElementById("doImpulseStepButton").style.visibility = "visible"
    document.getElementById("impulseStepSpan").innerHTML = manualMode
        ? "ручной ввод: измените импульсы в таблице и выполните шаги"
        : "автоматически подставлены целые импульсы от -10 до 10"
    document.getElementById("controlProgramStatus").textContent = manualMode
        ? `Подготовлен ручной ввод: ресурсов ${resources.length}, шагов управления ${maxControlStep}, отрезок графика ${targetFromStep}-${targetToStep}.`
        : `Подставлено: ресурсов ${resources.length}, шагов управления ${maxControlStep}, отрезок графика ${targetFromStep}-${targetToStep}. Достигнуто целей при целочисленном поиске: ${searchResult.score.achievedCount}/${targets.length}.`
    closeControlProgramForm()
    updateResizeHandles()
}

function putControlProgramMatrixToInputs(matrix) {
    const normalizedMatrix = matrix.map(row => row.map(value => clamp(Math.round(Number(value) || 0), -10, 10)))
    normalizedMatrix.forEach(row => {
        while (row.length < impulseSteps) row.push(0)
    })
    impulseMatrix = normalizedMatrix
    normalizedMatrix.forEach((row, nodeIndex) => {
        row.forEach((value, columnIndex) => {
            const input = document.getElementById("impulseInput:"+nodeIndex+"-"+columnIndex)
            if (input) input.value = value
        })
    })
}

function syncImpulseMatrixFromInputs() {
    impulseMatrix = []
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
        const row = []
        for (let stepIndex = 0; stepIndex < impulseSteps; stepIndex++) {
            const input = document.getElementById("impulseInput:"+nodeIndex+"-"+stepIndex)
            row.push(clamp(Math.round(Number(input?.value) || 0), -10, 10))
        }
        impulseMatrix.push(row)
    }
}

function resetControlProgramRun() {
    clearImpulseInputs()
    currImpulseStep = 0
    resValues = []
    document.getElementById("impulseStepSpan").innerHTML = ""
    document.getElementById("impulseChartContainer").style.display = "none"
    renderControlProgramResult()
    closeControlAcceptanceWindow()
}

function recalculateControlProgram(searchMultiplier = 2) {
    if (!lastControlProgramCheck || !lastControlProgramSearch) return false

    const { targetFromStep, targetToStep, resources, totalSteps } = lastControlProgramSearch
    const searchResult = findControlProgram(
        lastControlProgramCheck.targets,
        resources,
        totalSteps,
        targetFromStep,
        targetToStep,
        { searchMultiplier, maxPasses: 6 }
    )
    resetControlProgramRun()
    putControlProgramMatrixToInputs(searchResult.impulseMatrix)
    selectedImpulseNodesIds = [...new Set(resources.map(resource => resource.index))]
    showSelectedImpulseRows()
    updateImpulseControlsVisibility()
    document.getElementById("controlProgramStatus").textContent =
        `Выполнен перерасчет программы управления. Достигнуто целей при поиске: ${searchResult.score.achievedCount}/${lastControlProgramCheck.targets.length}.`
    return true
}

function getControlProgramImpulseMatrixFromInputs() {
    return nodes.map((node, nodeIndex) => {
        const row = []
        for (let stepIndex = 0; stepIndex < impulseSteps; stepIndex++) {
            const input = document.getElementById("impulseInput:"+nodeIndex+"-"+stepIndex)
            row.push(Number(input?.value) || 0)
        }
        return row
    })
}

function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

function saveAcceptedControlProgramToFile() {
    const payload = {
        createdAt: new Date().toISOString(),
        graph: serializeGraph(),
        targetInterval: lastControlProgramCheck ? {
            fromStep: lastControlProgramCheck.targetFromStep,
            toStep: lastControlProgramCheck.targetToStep
        } : null,
        targets: lastControlProgramCheck?.targets || [],
        resources: lastControlProgramSearch?.resources || [],
        impulseMatrix: getControlProgramImpulseMatrixFromInputs(),
        resultValues: resValues,
        verification: lastControlProgramVerification || getControlProgramVerification()
    }
    downloadBlob(JSON.stringify(payload, null, 2), "control-program.json", "application/json")
}

function saveCurrentProgramImage() {
    const sourceSvg = document.querySelector("#impulseChartContainer svg") || document.querySelector("#container svg")
    if (!sourceSvg) return

    const clonedSvg = sourceSvg.cloneNode(true)
    const box = sourceSvg.getBoundingClientRect()
    const width = Math.max(Math.ceil(box.width), Number(sourceSvg.getAttribute("width")) || 900)
    const height = Math.max(Math.ceil(box.height), Number(sourceSvg.getAttribute("height")) || 600)
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    clonedSvg.setAttribute("width", width)
    clonedSvg.setAttribute("height", height)

    const svgText = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)
    const image = new Image()
    image.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        URL.revokeObjectURL(url)
        canvas.toBlob(blob => {
            if (!blob) return
            const pngUrl = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = pngUrl
            a.download = "control-program.png"
            a.style.display = "none"
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(pngUrl)
        }, "image/png")
    }
    image.src = url
}

function renderControlAcceptanceWindow(message) {
    const verification = lastControlProgramVerification || getControlProgramVerification()
    const status = document.getElementById("controlAcceptanceStatus")
    const details = document.getElementById("controlAcceptanceDetails")
    renderControlAcceptanceActions()
    if (!verification) {
        status.className = "control-acceptance-status control-acceptance-status-warn"
        status.textContent = "Проверка еще не выполнена."
        details.innerHTML = ""
        return
    }

    status.className = verification.allAchieved
        ? "control-acceptance-status control-acceptance-status-ok"
        : "control-acceptance-status control-acceptance-status-fail"
    status.textContent = message || (verification.allAchieved
        ? `Все цели достигнуты (${verification.achievedCount}/${verification.totalTargets}).`
        : `Проверка не сошлась: достигнуто ${verification.achievedCount}/${verification.totalTargets} целей.`)

    const rows = verification.rows.map(row => `
        <tr class="${row.achieved ? "control-program-result-ok" : "control-program-result-fail"}">
            <td>${row.nodeName}</td>
            <td>${row.directionText}</td>
            <td>${Number(row.delta).toFixed(2)}</td>
            <td>${row.achieved ? "достигнуто" : "не достигнуто"}</td>
        </tr>
    `).join("")
    details.innerHTML = `
        <div class="control-acceptance-meta">Отрезок проверки: шаги ${verification.fromStep}-${verification.toStep}</div>
        <table class="control-acceptance-table">
            <thead>
                <tr><th>Цель</th><th>Тенденция</th><th>Δ</th><th>Итог</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `
}

function renderControlAcceptanceActions() {
    const isAccepted = controlProgramAcceptanceDecision === "accepted"
    const isRejected = controlProgramAcceptanceDecision === "rejected"
    document.getElementById("controlAcceptanceAcceptButton").style.display = controlProgramAcceptanceDecision ? "none" : "inline-block"
    document.getElementById("controlAcceptanceRejectButton").style.display = controlProgramAcceptanceDecision ? "none" : "inline-block"
    document.querySelectorAll(".control-acceptance-after-accept").forEach(button => {
        button.style.display = isAccepted ? "inline-block" : "none"
    })
    document.querySelectorAll(".control-acceptance-after-reject").forEach(button => {
        button.style.display = isRejected ? "inline-block" : "none"
    })
    document.querySelectorAll(".control-acceptance-after-decision").forEach(button => {
        button.style.display = controlProgramAcceptanceDecision ? "inline-block" : "none"
    })
}

function openControlAcceptanceWindow(message) {
    controlProgramAcceptanceDecision = null
    renderControlAcceptanceWindow(message)
    document.getElementById("controlAcceptanceForm").style.display = "block"
    document.getElementById("main").style.opacity = 0.45
}

function closeControlAcceptanceWindow() {
    document.getElementById("controlAcceptanceForm").style.display = "none"
    document.getElementById("main").style.opacity = 1
}

function runAllImpulseStepsWithoutAcceptance() {
    while (runVisibleImpulseStep()) {
    }
}

function finishControlProgramExecution() {
    if (!lastControlProgramCheck) return
    renderControlProgramResult()
    let verification = lastControlProgramVerification || getControlProgramVerification()

    if (verification && !verification.allAchieved && !controlProgramAutoRecalculated) {
        controlProgramAutoRecalculated = true
        const recalculated = recalculateControlProgram(2)
        if (recalculated) {
            runAllImpulseStepsWithoutAcceptance()
            renderControlProgramResult()
            verification = lastControlProgramVerification || getControlProgramVerification()
            openControlAcceptanceWindow(verification?.allAchieved
                ? "После автоматического перерасчета программа сошлась."
                : "Автоматический перерасчет выполнен, но часть целей все еще не достигнута.")
            return
        }
    }

    openControlAcceptanceWindow()
}

function ensureChartNodeFilterContainer() {
    let container = document.getElementById("chartNodeFilterContainer")
    if (container) return container

    container = document.createElement("div")
    container.id = "chartNodeFilterContainer"
    document.getElementById("doImpuleStepContainer").appendChild(container)
    return container
}

function initializeChartNodeFilter() {
    if (chartNodeFilterInitialized) return

    selectedChartNodeIds.clear()
    nodes.forEach(node => selectedChartNodeIds.add(node.id))
    chartNodeFilterInitialized = true
}

function getSelectedChartNodeIndexes() {
    initializeChartNodeFilter()

    const selectedIndexes = []
    for (let i=0;i<nodes.length;i++){
        const node = nodesNumberNodeMap.get(i)
        if (node && selectedChartNodeIds.has(node.id)) selectedIndexes.push(i)
    }
    return selectedIndexes
}

function renderChartNodeFilter() {
    initializeChartNodeFilter()

    const container = ensureChartNodeFilterContainer()
    container.innerHTML = ""

    const button = document.createElement("button")
    button.type = "button"
    button.className = "chart-node-filter-toggle"
    button.textContent = isChartNodeFilterOpen ? "Скрыть вершины графика" : "Выбрать вершины графика"
    button.addEventListener("click", () => {
        isChartNodeFilterOpen = !isChartNodeFilterOpen
        renderChartNodeFilter()
    })
    container.appendChild(button)

    if (!isChartNodeFilterOpen) return

    const list = document.createElement("div")
    list.className = "chart-node-filter-list"
    container.appendChild(list)

    nodes.forEach(node => {
        const label = document.createElement("label")
        label.className = "chart-node-filter-item"

        const checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.checked = selectedChartNodeIds.has(node.id)
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) selectedChartNodeIds.add(node.id)
            else selectedChartNodeIds.delete(node.id)
            renderImpulseChart()
        })

        const text = document.createElement("span")
        text.textContent = node.text

        const role = document.createElement("span")
        role.className = `chart-node-role-badge chart-node-role-${getNodeChartRole(node)}`
        role.textContent = getNodeChartRole(node) === "target" ? "цель" : getNodeChartRole(node) === "resource" ? "ресурс" : "прочее"

        label.appendChild(checkbox)
        label.appendChild(text)
        label.appendChild(role)
        list.appendChild(label)
    })
}

function getChartStepRange() {
    const availableSteps = resValues[0]?.length || 0
    const fromInput = Number.parseInt(document.getElementById("chartStepFromInput").value) || 1
    const toInput = Number.parseInt(document.getElementById("chartStepToInput").value) || fromInput
    const requestedFrom = Math.max(1, fromInput)
    const requestedTo = Math.max(requestedFrom, toInput)
    const from = requestedFrom
    const to = Math.min(requestedTo, availableSteps)

    document.getElementById("chartStepFromInput").value = requestedFrom
    document.getElementById("chartStepToInput").value = requestedTo

    return { from, to, availableSteps }
}

function renderImpulseChart() {
    if (!resValues.length || !resValues[0]?.length) return

    const { from, to, availableSteps } = getChartStepRange()
    if (!availableSteps || to < from) {
        document.getElementById("impulseChartContainer").innerHTML = ""
        return
    }

    const selectedIndexes = getSelectedChartNodeIndexes()
    const nodeNames = getNodeNamesForChart()
    const nodeRoles = getNodeChartRoles()
    const chartMatrix = selectedIndexes.map(index => resValues[index].slice(from - 1, to))
    const chartNodeNames = selectedIndexes.map(index => nodeNames[index])
    const chartNodeRoles = selectedIndexes.map(index => nodeRoles[index])

    if (!chartMatrix.length) {
        document.getElementById("impulseChartContainer").innerHTML = ""
        return
    }

    document.getElementById("impulseChartContainer").style.display = "flex"
    createChart("impulseChartContainer", chartMatrix, chartNodeNames, from, selectedIndexes, chartNodeRoles)
    installResizablePanels()
    updateResizeHandles()
}

function keepCurrentImpulseStepVisible() {
    if (currImpulseStep < 1) return

    const fromInput = document.getElementById("chartStepFromInput")
    const toInput = document.getElementById("chartStepToInput")
    const fromStep = Number.parseInt(fromInput.value) || 1
    const toStep = Number.parseInt(toInput.value) || fromStep

    if (currImpulseStep < fromStep) fromInput.value = currImpulseStep
    if (currImpulseStep > toStep) toInput.value = currImpulseStep
}

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

function runVisibleImpulseStep() {
    if(currImpulseStep==impulseSteps) {
        document.getElementById("impulseStepSpan").innerHTML = "все шаги выполнены"
        return false
    }
    syncImpulseMatrixFromInputs()
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
    keepCurrentImpulseStepVisible()
    renderImpulseChart()
    renderControlProgramResult()
    return true
}

//DO IMPULSE STEP BUTTON
doImpulseStepButton.addEventListener('click', () => {
    if (runVisibleImpulseStep() && currImpulseStep === impulseSteps) {
        finishControlProgramExecution()
    }
});

doAllImpulseStepsButton.addEventListener('click', () => {
    runAllImpulseStepsWithoutAcceptance()
    finishControlProgramExecution()
})
//SUBMIT EDIT NETWORK BUTTON
submitBuiltNetworkButton.addEventListener('click', ()=>{
    statusFlag=statusFlagConstants.impulseEditing
    setStatusText()
    document.getElementById("impulseEditor").style.display = "flex"

    document.getElementById("network-edit-menu").style.visibility = "hidden"
    document.getElementById("userTopMenu").style.display = "none"
    document.getElementById("impulseEditor").style.visibility = "visible"
    document.getElementById("returnEditNetworkButton").style.display = "block"
    document.getElementById("controlProgramButton").style.display = "block"
    document.getElementById("totalImpulseStepsSpan").innerHTML = "Количество шагов: "+impulseSteps;
    document.getElementById("impulseStepsInput").value = impulseSteps

    resetImpulseEditing()
    applyDefaultImpulsePanelLayout()
})

//RETURN EDIT BUTTON
returnEditNetworkButton.addEventListener('click', ()=>{
    statusFlag=statusFlagConstants.idle
    setStatusText()
    document.getElementById("impulseEditor").style.display = "none"
    document.getElementById("impulseChartContainer").style.display = "none"
    document.getElementById("network-edit-menu").style.visibility = "visible"
    document.getElementById("userTopMenu").style.display = "flex"
    document.getElementById("impulseEditor").style.visibility = "hidden"
    document.getElementById("returnEditNetworkButton").style.display = "block"
    document.getElementById("controlProgramButton").style.display = "none"
    document.getElementById("container").style.width = "96%"
    impulseSteps = 0;
    document.getElementById("impulseStepsInput").value = impulseSteps
    currImpulseStep = 0;
    document.getElementById("chartStepFromInput").value = 1
    document.getElementById("chartStepToInput").value = 10
    const chartNodeFilterContainer = document.getElementById("chartNodeFilterContainer")
    if (chartNodeFilterContainer) chartNodeFilterContainer.innerHTML = ""
    isChartNodeFilterOpen = false
    closeControlAcceptanceWindow()
    closeControlProgramForm()
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
const myObject = serializeGraph();

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
                nodes = json.nodes.map(d => normalizeNodeRole({ ...d }));
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
    const sourceId = getLinkSourceId(tempLinkForEdit)
    const targetId = getLinkTargetId(tempLinkForEdit)
    console.log(sourceId)
    console.log(links)
    links = links.filter(element => (getLinkSourceId(element) !== sourceId)||(getLinkTargetId(element) !== targetId));
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
    document.getElementById("impulseStepsInput").value = impulseSteps
    currImpulseStep = 0;

    document.getElementById("impulseInputContainer").innerHTML = ""
    if (document.getElementById("impulseRemoveStepButton")) document.getElementById("impulseRemoveStepButton").style.visibility = "hidden"
    document.getElementById("impulseForNodeContainer").style.visibility = "hidden"
    document.getElementById("impulseSubmitButton").style.visibility = "hidden"
    if (document.getElementById("impulseAddStepButton")) document.getElementById("impulseAddStepButton").style.visibility = "visible"
    document.getElementById("doImpulseStepButton").style.visibility = "hidden"
    document.getElementById("doImpuleStepContainer").style.visibility = "hidden"
    document.getElementById("impulseStepSpan").innerHTML = "номер текущего шага: 0"
    document.getElementById("impulseInputContainer").innerHTML = ""
    document.getElementById("impulseChartContainer").style.display = "none"
    document.getElementById("impulseStepSpan").innerHTML = ""
    document.getElementById("chartStepFromInput").value = 1
    document.getElementById("chartStepToInput").value = 10
    selectedChartNodeIds.clear()
    chartNodeFilterInitialized = false
    isChartNodeFilterOpen = false
    const chartNodeFilterContainer = document.getElementById("chartNodeFilterContainer")
    if (chartNodeFilterContainer) chartNodeFilterContainer.innerHTML = ""
    lastControlProgramCheck = null
    lastControlProgramSearch = null
    lastControlProgramVerification = null
    controlProgramAutoRecalculated = false
    controlProgramAcceptanceDecision = null
    closeControlAcceptanceWindow()
    renderControlProgramResult()
    renderChartNodeFilter()
}

if(loggedUser==null) document.getElementById("networkSelect").style.display = "none";
if(loggedUser==null) document.getElementById("networkNameInputContainer").style.display = "none";
if(loggedUser==null) document.getElementById("returnEditNetworkButton").style.display = "none";
document.getElementById("controlProgramButton").style.display = "none";
if(loggedUser==null) document.getElementById("openSelectedNetworkButton").style.display = "none";
if(loggedUser==null) document.getElementById("networkSaveButton").style.display = "none";

document.getElementById("rangeSlider").addEventListener('input', () => {
    let val = document.getElementById("rangeSlider").value
    console.log(val)
    nodeRadius = Number(val)
    reRender()
})

document.getElementById("layoutLockCheckbox").addEventListener('change', (event) => {
    isLayoutLocked = event.target.checked
    applyLayoutMode()
})

const panelLayoutGap = 12
const panelViewportPadding = 12

function getPanelMinSize(panel, propertyName, fallback) {
    return Number.parseFloat(getComputedStyle(panel)[propertyName]) || fallback
}

function isPanelVisible(panel) {
    return panel && getComputedStyle(panel).display !== "none"
}

function getRightColumnPanels() {
    return [
        document.getElementById("impulseChartContainer"),
        document.getElementById("impulseEditor")
    ].filter(Boolean)
}

function isImpulseLayoutVisible() {
    return getRightColumnPanels().some(isPanelVisible)
}

function getRightColumnMinWidth() {
    return Math.max(...getRightColumnPanels().map(panel => getPanelMinSize(panel, "minWidth", 260)), 260)
}

function setRightColumn(left, width) {
    getRightColumnPanels().forEach(panel => {
        panel.style.left = `${Math.round(left)}px`
        panel.style.width = `${Math.round(width)}px`
    })
    updateResizeHandles()
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function applyHorizontalPanelLayout(activePanel, directions, startRect, dx) {
    const graphPanel = document.getElementById("container")
    if (!graphPanel) return null

    const graphRect = graphPanel.getBoundingClientRect()
    const graphMinWidth = getPanelMinSize(graphPanel, "minWidth", 280)
    const rightMinWidth = getRightColumnMinWidth()
    const viewportRight = window.innerWidth - panelViewportPadding
    const impulseVisible = isImpulseLayoutVisible()

    let nextLeft = startRect.left
    let nextWidth = startRect.width

    if (directions.includes("right")) {
        const maxWidth = impulseVisible
            ? viewportRight - graphRect.left - panelLayoutGap - rightMinWidth
            : viewportRight - graphRect.left
        nextWidth = clamp(startRect.width + dx, graphMinWidth, maxWidth)

        if (activePanel === graphPanel && impulseVisible) {
            const rightLeft = graphRect.left + nextWidth + panelLayoutGap
            const rightWidth = viewportRight - rightLeft
            setRightColumn(rightLeft, Math.max(rightMinWidth, rightWidth))
        }
    }

    if (directions.includes("left")) {
        const rightEdge = viewportRight
        const minLeft = graphRect.left + graphMinWidth + panelLayoutGap
        const maxLeft = rightEdge - rightMinWidth
        nextLeft = clamp(startRect.left + dx, minLeft, maxLeft)
        nextWidth = rightEdge - nextLeft

        const nextGraphWidth = Math.max(graphMinWidth, nextLeft - graphRect.left - panelLayoutGap)
        graphPanel.style.width = `${Math.round(nextGraphWidth)}px`
        setRightColumn(nextLeft, nextWidth)
    }

    return { width: nextWidth, left: nextLeft }
}

function applyVerticalPanelLayout(activePanel, startRect, dy) {
    const chartPanel = document.getElementById("impulseChartContainer")
    const editorPanel = document.getElementById("impulseEditor")
    const minHeight = getPanelMinSize(activePanel, "minHeight", 160)
    const viewportBottom = window.innerHeight - panelViewportPadding

    if (activePanel === chartPanel && isPanelVisible(editorPanel)) {
        const editorRect = editorPanel.getBoundingClientRect()
        const editorMinHeight = getPanelMinSize(editorPanel, "minHeight", 160)
        const sharedBottom = Math.min(viewportBottom, editorRect.bottom)
        const maxChartHeight = sharedBottom - startRect.top - panelLayoutGap - editorMinHeight
        const nextChartHeight = clamp(startRect.height + dy, minHeight, maxChartHeight)
        const nextEditorTop = startRect.top + nextChartHeight + panelLayoutGap
        const nextEditorHeight = sharedBottom - nextEditorTop

        chartPanel.style.height = `${Math.round(nextChartHeight)}px`
        editorPanel.style.top = `${Math.round(nextEditorTop)}px`
        editorPanel.style.height = `${Math.round(nextEditorHeight)}px`
        updateResizeHandles()

        return nextChartHeight
    }

    const maxBottom = viewportBottom
    return clamp(startRect.height + dy, minHeight, maxBottom - startRect.top)
}

function addResizeHandle(panel, className, directions) {
    if (panel.querySelector(`.${className}`)) return

    const handle = document.createElement("div")
    handle.className = `resize-handle ${className}`
    handle.addEventListener("mousedown", (event) => {
        event.preventDefault()
        event.stopPropagation()

        const startX = event.clientX
        const startY = event.clientY
        const rect = panel.getBoundingClientRect()

        function onMouseMove(moveEvent) {
            const dx = moveEvent.clientX - startX
            const dy = moveEvent.clientY - startY
            let nextWidth = rect.width
            let nextHeight = rect.height
            let nextLeft = rect.left

            if (directions.includes("right") || directions.includes("left")) {
                const horizontalLayout = applyHorizontalPanelLayout(panel, directions, rect, dx)
                if (horizontalLayout) {
                    nextWidth = horizontalLayout.width
                    nextLeft = horizontalLayout.left
                }
            }

            if (directions.includes("bottom")) {
                nextHeight = applyVerticalPanelLayout(panel, rect, dy)
            }

            if (!directions.includes("left")) panel.style.width = `${Math.round(nextWidth)}px`
            if (directions.includes("bottom")) panel.style.height = `${Math.round(nextHeight)}px`
            if (directions.includes("left")) panel.style.left = `${Math.round(nextLeft)}px`
            updateResizeHandles()
        }

        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
        }

        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
    })

    panel.appendChild(handle)
    updateResizeHandles()
}

function updateResizeHandles() {
    document.querySelectorAll(".resize-handle").forEach(handle => {
        const panel = handle.parentElement
        if (!panel || !isPanelVisible(panel)) {
            handle.style.display = "none"
            return
        }

        const rect = panel.getBoundingClientRect()
        handle.style.display = "block"
        if (handle.classList.contains("resize-handle-right")) {
            handle.style.left = `${Math.round(rect.right - 7)}px`
            handle.style.top = `${Math.round(rect.top + rect.height / 2 - 24)}px`
        } else if (handle.classList.contains("resize-handle-left")) {
            handle.style.left = `${Math.round(rect.left)}px`
            handle.style.top = `${Math.round(rect.top + rect.height / 2 - 24)}px`
        } else if (handle.classList.contains("resize-handle-bottom-right")) {
            handle.style.left = `${Math.round(rect.right - 16)}px`
            handle.style.top = `${Math.round(rect.bottom - 16)}px`
        } else if (handle.classList.contains("resize-handle-bottom-left")) {
            handle.style.left = `${Math.round(rect.left)}px`
            handle.style.top = `${Math.round(rect.bottom - 16)}px`
        } else if (handle.classList.contains("resize-handle-bottom")) {
            handle.style.left = `${Math.round(rect.left + rect.width / 2 - 24)}px`
            handle.style.top = `${Math.round(rect.bottom - 7)}px`
        }
    })
}

function getWorkspaceTopOffset() {
    const topMenu = document.getElementById("top-menu")
    const menuBottom = topMenu ? topMenu.getBoundingClientRect().bottom : 0
    return Math.ceil(menuBottom + panelViewportPadding)
}

function applyDefaultImpulsePanelLayout() {
    const graphPanel = document.getElementById("container")
    const chartPanel = document.getElementById("impulseChartContainer")
    const editorPanel = document.getElementById("impulseEditor")
    if (!graphPanel || !chartPanel || !editorPanel) return

    const top = getWorkspaceTopOffset()
    const bottom = panelViewportPadding
    const left = panelViewportPadding
    const viewportRight = window.innerWidth - panelViewportPadding
    const availableHeight = Math.max(
        getPanelMinSize(graphPanel, "minHeight", 280),
        window.innerHeight - top - bottom
    )
    const rightWidth = Math.max(getRightColumnMinWidth(), Math.round((viewportRight - left) * 0.36))
    const rightLeft = viewportRight - rightWidth
    const graphWidth = Math.max(getPanelMinSize(graphPanel, "minWidth", 280), rightLeft - left - panelLayoutGap)
    const splitHeight = Math.max(180, Math.floor((availableHeight - panelLayoutGap) / 2))

    graphPanel.style.left = `${left}px`
    graphPanel.style.top = `${top}px`
    graphPanel.style.width = `${graphWidth}px`
    graphPanel.style.height = `${availableHeight}px`

    chartPanel.style.left = `${rightLeft}px`
    chartPanel.style.top = `${top}px`
    chartPanel.style.width = `${rightWidth}px`
    chartPanel.style.height = `${splitHeight}px`

    editorPanel.style.left = `${rightLeft}px`
    editorPanel.style.top = `${top + splitHeight + panelLayoutGap}px`
    editorPanel.style.width = `${rightWidth}px`
    editorPanel.style.height = `${availableHeight - splitHeight - panelLayoutGap}px`
    updateResizeHandles()
}

function installResizablePanels() {
    const graphPanel = document.getElementById("container")
    const chartPanel = document.getElementById("impulseChartContainer")
    const editorPanel = document.getElementById("impulseEditor")

    if (graphPanel) {
        addResizeHandle(graphPanel, "resize-handle-right", ["right"])
        addResizeHandle(graphPanel, "resize-handle-bottom", ["bottom"])
        addResizeHandle(graphPanel, "resize-handle-bottom-right", ["right", "bottom"])
    }

    if (chartPanel) {
        addResizeHandle(chartPanel, "resize-handle-left", ["left"])
        addResizeHandle(chartPanel, "resize-handle-bottom", ["bottom"])
        addResizeHandle(chartPanel, "resize-handle-bottom-left", ["left", "bottom"])
    }

    if (editorPanel) {
        addResizeHandle(editorPanel, "resize-handle-left", ["left"])
        addResizeHandle(editorPanel, "resize-handle-bottom", ["bottom"])
        addResizeHandle(editorPanel, "resize-handle-bottom-left", ["left", "bottom"])
    }
}

installResizablePanels()
window.addEventListener("resize", updateResizeHandles)
window.addEventListener("scroll", updateResizeHandles)
