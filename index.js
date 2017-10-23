
const size = {
    height: 620,
    width: 1000,
    margin: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
    },
    legend: {
        //width & height del rectangulo
        width: 100,
        height: 10,    
        margin: {
            top: 0,
            right: 0,
            bottom: 10,
            left: 0,
        },
    }
}

const getJSON = function(url, callback) {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            const data = JSON.parse(request.responseText);
            callback( undefined, data);
        } else {
            callback( new Error(`Request status invalid: ${request.status}`));
        }
    };
    
    request.onerror = function() {
        callback(new Error("Hubo un error en el request"));
    };
    
    request.send();
}


const drawChart = function(size) {
    
    const svg = d3.select("#myChart")
    .append("svg")
    .attr("viewBox", `0 0 ${size.width} ${size.height}`)
    .attr("preserveAspectRatio", "xMidYMid meet" );
    
    const mapLayer = svg.append('g')
    .attr("transform", `translate(${size.margin.left}, ${size.margin.top})`)
    .classed('map-layer', true);

    const legend = svg.append('g')
    .attr("transform", `translate(${2*size.width/3}, ${size.margin.top})`)
    .classed("legend", true);

    const gradient = legend.append("defs")
    .append("svg:linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%")
    .attr("spreadMethod", "pad");
    
    const path = d3.geoPath();
    
    const tip = d3.tip().attr('class', 'd3-tip').html((d) => {
        return (
            `${d.area_name} County, ${d.state}: ${d.bachelorsOrHigher}%`
        )
    });
    mapLayer.call(tip);

    const color = d3.scaleLinear()
    .range(['#dfffdb', '#0a4c00']);
    
    
    d3.json('./datasets/counties.json', function(err, topology) {
        if(err) throw err;
        getJSON("./datasets/for_user_education.json", (err, data) => {
            var geojson = topojson.feature(topology, topology.objects.counties); 
            var features = geojson.features;
            // Update color scale domain based on data
            const dataMin = d3.min(data.map( (d) => d.bachelorsOrHigher) );
            const dataMax = d3.max(data.map( (d) => d.bachelorsOrHigher) );
            color.domain([ dataMin, dataMax ]);
            
            // Draw each province as a path
            mapLayer.selectAll('path')
            .data(features)
            .enter().append('path')
            .attr('d', path)
            .classed('mapPath', true)
            .attr("fill", (d) => {
                const currentData = data.find( (county) => county.fips===d.id );
                return color(currentData.bachelorsOrHigher);
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", ".5px")
            .on('mouseover', function (d,i) {
                const coords = d3.mouse(this);
                if ( coords[0] < size.width/4) tip.direction("ne");
                if ( coords[0] > 3*size.width/4) tip.direction("nw");
                if ( coords[0] < 3*size.width/4 && coords[0] > size.width/4 ) tip.direction("n");
                tip.show(data.find( (county) => county.fips===d.id ),i);
            })
            .on('mouseout', tip.hide);

            //Legend
            gradient.append("stop").attr("offset", "0%").attr("stop-color", color(dataMin)).attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", "100%").attr("stop-color", color(dataMax)).attr("stop-opacity", 1);
            legend.append("rect")
            .attr("width", size.legend.width)
            .attr("height", size.legend.height)
            .style("fill", "url(#gradient)");

            //Another scale necessary bc the color scale doesnt work for axes
            const legendScale = d3.scaleLinear()
            .domain([dataMin, dataMax])
            .range([0, size.legend.width]);
            legend.append("g")
            .attr("transform", `translate(
                ${0},
                ${size.legend.height}
            )`)
            .call(d3.axisBottom(legendScale)
                .tickValues([dataMin, (dataMin+dataMax)/2, dataMax])
                .tickFormat((d) => `${d3.format(".1f")(d)}%`)
            );
            
        });
    });
}


window.onload = () => {
    drawChart(size);
};