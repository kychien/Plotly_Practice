
// Function to display sample metadata
function buildMetadata(sample) {

  // Use `d3.json` to fetch the metadata for a sample
  d3.json(`/metadata/${sample}`).then(results => {

    // Get metadata target 
    var samMD = d3.select("#sample-metadata");

    // Clear any existing metadata
    samMD.html("");
    
    // Add metadata of current sample
    Object.entries(results).forEach(([key, val]) => {
      var line = samMD.append("p");
      line.html(`<strong>${key.toUpperCase()}:</strong> ${val}`);
    });
    // Adjust gauge chart to current sample
    buildGauge(results.WFREQ);
  });
}

// Function to build wash frequency gauge
function buildGauge(times) {
  // figure out angle of times
  var degrees = (10 - times) * 18;
  var radius = .5;
  
  var radians = degrees * Math.PI/180;
  var x = radius * Math.cos(radians);
  var y = radius * Math.sin(radians);
  var mainPath = 'M -.0 -0.025 L .0 0.025 L ',
     pathX = String(x),
     space = ' ',
     pathY = String(y),
     pathEnd = ' Z';
  var path = mainPath.concat(pathX,space,pathY,pathEnd);
  var data = [{
    type: 'scatter',
    x: [0], y:[0],
    marker: {size: 28, color:'850000'},
    showlegend: false,
    name: 'avg. scrubs',
    text: times,
    hoverinfo: 'text+name'},
    {values: [50/7, 50/7, 50/7, 50/7, 50/7, 50/7, 50/7, 50],
    rotation: 90,
    text: ['6+', '5-6', '4-5', '3-4', '2-3', '1-2', '0-1', ''],
    textinfo: 'text',
    textposition:'inside',
    marker: {colors:['rgba(14, 127, 0, .5)', 'rgba(110, 154, 22, .5)',
                     'rgba(170, 202, 42, .5)', 'rgba(202, 209, 95, .5)',
                     'rgba(210, 206, 145, .5)', 'rgba(232, 226, 202, .5)',
                     'rgba(232, 246, 202, .5)', 'rgba(255, 255, 255, 0)']},
    labels: ['6+', '5-6', '4-5', '3-4', '2-3', '1-2', '0-1', ''],
    hoverinfo: 'label',
    hole: .5,
    type: 'pie',
    showlegend: false
  }];

  var layout = {
    shapes:[{
      type: 'path',
      path: path,
      fillcolor: '850000',
      line: {
        color: '850000'
      }
    }],
    title: '<b>Belly Button Washing Frequency</b><br>Average Number of Scrubs per Week',
    xaxis: {
      zeroline:false, 
      showticklabels:false,
      showgrid: false, 
      range: [-1, 1]},
    yaxis: {
      zeroline:false, 
      showticklabels:false,
      showgrid: false, 
      range: [-1, 1]}
  };

  Plotly.newPlot('gauge', data, layout);
}
// Function to generate colors for the bubble plot
var counter = 1;
function genRGB(seed) {
  var r = (counter%3)*100 + (seed % (255-((counter%3)*100)));
  counter++;
  var g = (counter%3)*100 + (seed % (255-((counter%3)*100)));
  counter++;
  var b = (counter%3)*100 + (seed % (255-((counter%3)*100)));
  return (`rgb(${r}, ${g}, ${b})`);
}



function buildCharts(sample) {

  // Fetch the sample data for the plots
  d3.json(`/samples/${sample}`).then(results =>{
  
    // Make copies to avoid corrupting data during manipulation
    var vals = results.sample_values.map(m => m);
    var ids = results.otu_ids.map(m => m);
    var lbls = results.otu_labels.map(m => m);
    
    // Generate colors for the plot
    var colors = vals.map(m => genRGB(m));
    
    // Generate hover text
    var descrp = vals.map((m, i) => `(${ids[i]}, ${m}) ${lbls[i]}`);
    
    // Set up plot data
    var bblTrace = {
      x: ids,
      y: vals,
      text: descrp,
      mode: "markers",
      marker: {
        color:colors,
        size: vals
      }
    };
    var bblData = [bblTrace]; 

    // Adjust plot labels
    var bblLayout = {
      title:"<b>Belly Button Inhabitants</b>",
      xaxis:{title:"OTU ID"},
      showlegend:false
    };

    // Add the plot to the page
    Plotly.newPlot("bubble", bblData, bblLayout);

    // Isolate the top 10 inhabitants for a pie chart
    var topTenVal = vals.sort((a, b) => (b - a)).slice(0, 10);

    // Get the indices of the top 10
    var topTenInd = topTenVal.map(m => results.sample_values.indexOf(m));
    
    console.log(topTenInd);
    // Correct for tie values and early indexOf returns 
    for (var i = 1; i < 10; i++) {
      if (topTenInd[i] == topTenInd[i-1]) {
        console.log("Adjustment for duplicate!");
        topTenInd[i] = results.sample_values.indexOf(topTenVal[i], (topTenInd[i-1]+1));
      }
    }
    console.log(topTenInd);

    // Get the matching labels and generate descriptions
    var topTenIDs = topTenInd.map(i => `OTU ID:${ids[i]}`);
    var topTenLbl = topTenInd.map(i => lbls[i]);

    // Create trace
    var pie1 = {
      labels:topTenIDs,
      values:topTenVal,
      hovertext:topTenLbl,
      type:"pie"
    }

    // Convert Trace to data
    var pieData = [pie1];

    // Set up pie chart layout
    var pieLayout = {
      title:"<b>Top Ten Inhabitants</b>",
      showtext: false,
      showlegend: true,
      legend:{
        text:"OTU ID",
        x:1,
        y:0.5
      }
    };

    // Add plot to page
    Plotly.newPlot("pie", pieData, pieLayout);

  });
}

function init() {
  // Grab a reference to the dropdown select element
  var selector = d3.select("#selDataset");

  // Use the list of sample names to populate the select options
  d3.json("/names").then((sampleNames) => {
    sampleNames.forEach((sample) => {
      selector
        .append("option")
        .text(sample)
        .property("value", sample);
    });

    // Use the first sample from the list to build the initial plots
    const firstSample = sampleNames[0];
    buildCharts(firstSample);
    buildMetadata(firstSample);
  });
}

function optionChanged(newSample) {
  // Fetch new data each time a new sample is selected
  buildCharts(newSample);
  buildMetadata(newSample);
}

// Initialize the dashboard
init();
