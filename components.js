export function createMatrixInput(idPrefix, idContainer, rowCount, columnCount, rowHeaders, columnHeaders) {
    let container = document.getElementById(idContainer);

    if (!container) {
        console.error(`Container with id ${idContainer} not found.`);
        return;
    }

    // Создаем элемент таблицы
    const table = document.createElement('table');
    table.border = '1'; // Добавьте рамку для визуализации

    // Задаем размеры матрицы (например, 3x3)
    const rows = 3;
    const cols = 3;

    for (let i = 0; i < rowCount; i++) {
        let row = document.createElement('tr');

        let firstCellInRow = document.createElement('td')
        if(i==0 && columnHeaders!=null){
            row.style.display = "flex"
            firstCellInRow.innerHTML = ""
            console.log(columnCount)
            firstCellInRow.style.width = (100/(columnCount+1)).toString()+"%"
            row.appendChild(firstCellInRow)
            for(let j=0;j<columnCount;j++){
                const cell = document.createElement('td');
                cell.innerHTML = columnHeaders[j]
                cell.className = `${idPrefix}Column-${j+1}`;
                cell.style.width = (100/(columnCount+1)).toString()+"%"
                row.appendChild(cell)
            }
            table.appendChild(row)
            row = document.createElement('tr');
        }
        row.style.display = "none"
        row.id = `${idPrefix}Row:${i}`;
        firstCellInRow = document.createElement('td')
        firstCellInRow.style.width = (100/(columnCount+1)).toString()+"%"
        firstCellInRow.innerHTML = rowHeaders[i]
        row.appendChild(firstCellInRow)
        for (let j = 0; j < columnCount; j++) {
            const cell = document.createElement('td');
            const input = document.createElement('input');

            // Устанавливаем уникальный id для каждого input
            input.id = `${idPrefix}Input:${i}-${j}`;
            input.type = 'number';
            cell.style.width = (100/(columnCount+1)).toString()+"%"
            cell.className = `${idPrefix}Column-${j+1}`;
            input.style.width = (90).toString()+"%"

            // Добавляем input в ячейку
            cell.appendChild(input);
            row.appendChild(cell);
        }
        table.appendChild(row);
    }

    // Добавляем таблицу в контейнер
    container.innerHTML = ''
    table.style.width = (100).toString()+"%"
    table.id = idPrefix+"Table"
    container.appendChild(table);
}

export function createChart(idContainer, resMatrix, nodeNames) {
    console.log(nodeNames)
    // Шаг 1: Подготовка контейнера
    let container = document.getElementById(idContainer);

    const color = d3.scaleSequential(d3.interpolateRdYlGn);

    //color((d.value-minNodeValue)/(maxNodeValue-minNodeValue+1)))

    let minNodeValue = null;
    let maxNodeValue = null;
    let length = resMatrix[0].length-1;
    for(let i=0;i<resMatrix.length;i++){
        let temp = resMatrix[i][length]
        if(minNodeValue==null) minNodeValue=temp
        if(maxNodeValue==null) maxNodeValue=temp
        if(minNodeValue>temp) minNodeValue = temp
        if(maxNodeValue<temp) maxNodeValue = temp
    }
    console.log(minNodeValue+" -minmax- "+maxNodeValue)

    /*
    var node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll()
        .data(nodes)
        .join("circle")
        .attr("r", 25)
        .attr("fill", d => color((d.value-minNodeValue)/(maxNodeValue-minNodeValue+1))).on("click", nodeClicked);*/

    if (!container) {
        console.error(`Container with id ${idContainer} not found.`);
        return;
    }
    container.innerHTML = '';

    const margin = { top: 20, right: 30, bottom: 30, left: 40 },
        width = 600 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;


// Create the SVG container.
    /*
    var svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 95%; height: 90%; width: 90%")
    */



    var svg = d3.create("svg")
        .attr("width", "95%") // Ширина svg контейнера
        .attr("height", "95%") // Высота svg контейнера
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet") // Позволяет сохранить пропорции и центрировать содержимое
        .style("max-width", "100%") // Максимальная ширина
        .style("height", "auto"); // Автоматическая высота

    // Create the SVG container.
    /*
 const svg = d3.create("svg")
 .attr("width", width)
 .attr("height", height);*/

    // Шаг 2: Подготовка данных и создание масштабов
    const nRows = resMatrix.length;
    const nCols = resMatrix[0].length;

    console.log(`Number of rows: ${nRows}`);
    console.log(`Number of columns: ${nCols}`);

    const xScale = d3.scaleLinear()
        .domain([0, nCols - 1])
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([
            d3.min(resMatrix.flat(), d => d),
            d3.max(resMatrix.flat(), d => d)
        ])
        .range([height - margin.bottom, margin.bottom]);

    // Шаг 3: Создание осей
    const xAxis = d3.axisBottom(xScale).ticks(nCols);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    //Ось X
    svg.append("g")
        //.attr("transform", `translate(0,${height})`)
        .call(xAxis)
        //.append("text")
        //.attr("fill", "#000")
        //.attr("x", width)
        .attr("transform", `translate(0,${height - margin.bottom})`)
    //.attr("dy", "-0.5em")
    //.attr("text-anchor", "end")
    //.text("Номер столбца");

    // Добавление оси Y и меток для значений matrix[i][j]
    svg.append("g")
        .call(yAxis)
        //.append("text")
        //.attr("fill", "#000")
        //.attr("transform", "rotate(-90)")
        .attr("transform", `translate(${margin.left},0)`)
    //.attr("y", 6)
    //.attr("dy", "0.75em")
    //.attr("text-anchor", "end")
    //.text("Значение")
    //.style("font-size", "12px"); // Установка размера шрифта меток

    /*
    // Добавление меток для значений matrix[i][j] на ось Y
    svg.selectAll(".tick text")
    .attr("fill", "black") // Цвет меток
    .attr("font-size", "10px"); // Размер шрифта меток
    */

    // Шаг 4: Создание линий для каждой строки и добавление точек
    const line = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(d));

    resMatrix.forEach((row, rowIndex) => {
        console.log(`Row ${rowIndex} data: ${row}`);

        // Добавление линии
        svg.append("path")
            .datum(row)
            .attr("fill", "none")
            .attr("stroke", d => {
                console.log(d)
                return color((d[d.length-1]-minNodeValue)/(maxNodeValue-minNodeValue+1))
            })
            .attr("stroke-width", 1.5)
            .attr("d", line);

        // Добавление точек
        svg.selectAll(`circle.row-${rowIndex}`)
            .data(row)
            .enter()
            .append("circle")
            .attr("class", `row-${rowIndex}`)
            .attr("cx", (d, i) => xScale(i))
            .attr("cy", d => yScale(d))
            .attr("r", 3)
            .attr("fill", "red")
            .attr("title", nodeNames[rowIndex])

        /*
        // Добавление подписи в конце линии с отступом
        const lastPoint = row[row.length - 1];
        svg.append("text")
            .attr("x", xScale(row.length - 1))
            .attr("y", yScale(lastPoint))
            .attr("text-anchor", "start")
            .attr("fill", "black")
            .text(nodeNames[rowIndex]);*/
    });

    // Добавление созданного SVG в контейнер
    container.appendChild(svg.node());
}



/*
let aapl = chartData;

    console.log(aapl)

    // Specify the dimensions of the chart.
  // Declare the chart dimensions and margins.
  const width = 928;
  const height = 500;
  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 40;

  // Declare the x (horizontal position) scale.
  const x = d3.scaleUtc(d3.extent(aapl, d => d.date), [marginLeft, width - marginRight]);

  // Declare the y (vertical position) scale.
  const y = d3.scaleLinear([0, d3.max(aapl, d => d.close)], [height - marginBottom, marginTop]);

  // Declare the line generator.
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.close));


  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  // Add the x-axis.
  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // Add the y-axis, remove the domain line, add grid lines and a label.
  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(height / 40))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
          .attr("x2", width - marginLeft - marginRight)
          .attr("stroke-opacity", 0.1))
      .call(g => g.append("text")
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Daily close ($)"));

  // Append a path for the line.
  svg.append("path")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line(aapl));

      // Добавляем chart в контейнер
      let container = document.getElementById(idContainer);

      if (!container) {
          console.error(`Container with id ${idContainer} not found.`);
          return;
      }
      container.innerHTML = ''
      container.appendChild(svg.node());
*/