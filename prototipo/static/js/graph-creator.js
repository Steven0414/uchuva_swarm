graph = undefined;
var numRend = 0;
document.onload = (function(d3, saveAs, Blob, undefined) {
    "use strict";

    // define graphcreator object
    var GraphCreator = function(svg, nodes, edges) {
        var thisGraph = this;
        thisGraph.idct = 0;

        thisGraph.nodes = nodes || [];
        thisGraph.edges = edges || [];

        thisGraph.nodes.forEach(function(nodo) {
            if (nodo.id >= thisGraph.idct) {
                thisGraph.idct = nodo.id + 1;
            }
        });
        thisGraph.state = {
            selectedNode: null,
            selectedEdge: null,
            mouseDownNode: null,
            mouseDownLink: null,
            justDragged: false,
            justScaleTransGraph: false,
            lastKeyDown: -1,
            shiftNodeDrag: false,
            selectedText: null
        };

        // define arrow markers for graph links
        var defs = svg.append('svg:defs');
        defs.append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', "32")
            .attr('markerWidth', 3.5)
            .attr('markerHeight', 3.5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5');

        // define arrow markers for leading arrow
        defs.append('svg:marker')
            .attr('id', 'mark-end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 7)
            .attr('markerWidth', 3.5)
            .attr('markerHeight', 3.5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5');

        thisGraph.svg = svg;
        thisGraph.svgG = svg.append("g")
            .classed(thisGraph.consts.graphClass, true);
        var svgG = thisGraph.svgG;

        // displayed when dragging between nodes
        thisGraph.dragLine = svgG.append('svg:path')
            .attr('class', 'link dragline hidden')
            .attr('d', 'M0,0L0,0')
            .style('marker-end', 'url(#mark-end-arrow)');

        // svg nodes and edges
        thisGraph.paths = svgG.append("g").selectAll("g");
        thisGraph.circles = svgG.append("g").selectAll("g");

        thisGraph.drag = d3.behavior.drag()
            .origin(function(d) {
                return {
                    x: d.x,
                    y: d.y
                };
            })
            .on("drag", function(args) {
                thisGraph.state.justDragged = true;
                thisGraph.dragmove.call(thisGraph, args);
            })
            .on("dragend", function() {
                // todo check if edge-mode is selected
            });

        // listen for key events
        d3.select(window).on("keydown", function() {
                thisGraph.svgKeyDown.call(thisGraph);
            })
            .on("keyup", function() {
                thisGraph.svgKeyUp.call(thisGraph);
            });
        svg.on("mousedown", function(d) {
            thisGraph.svgMouseDown.call(thisGraph, d);
        });
        svg.on("mouseup", function(d) {
            thisGraph.svgMouseUp.call(thisGraph, d);
        });

        // listen for dragging
        var dragSvg = d3.behavior.zoom()
            .on("zoom", function() {
                if (d3.event.sourceEvent.shiftKey) {
                    // TODO  the internal d3 state is still changing
                    return false;
                } else {
                    thisGraph.zoomed.call(thisGraph);
                }
                return true;
            })
            .on("zoomstart", function() {
                var ael = d3.select("#" + thisGraph.consts.activeEditId).node();
                if (ael) {
                    ael.blur();
                }
                if (!d3.event.sourceEvent.shiftKey) d3.select('body').style("cursor", "move");
            })
            .on("zoomend", function() {
                d3.select('body').style("cursor", "auto");
            });

        svg.call(dragSvg).on("dblclick.zoom", null);

        // listen for resize
        window.onresize = function() {
            thisGraph.updateWindow(svg);
        };

        // handle download data
        d3.select("#save-input").on("click", function() {
            var saveEdges = [];
            thisGraph.edges.forEach(function(val, i) {
                saveEdges.push({
                  source: {id :val.source.id},
                  target: {id :val.target.id}
                });
            });

          svgAsPngUri(document.getElementById("grafo"), {}, function(uri) {
                var envio = {
                    "proyecto": proyecto,
                    "nodes": thisGraph.nodes,
                    "edges": saveEdges,
                    "imagen": uri,
                    "workloader": workloader
                };
                var blob = JSON.stringify(envio);
                $.ajax({
                    type: "POST",
                    url: "/save",
                    contentType:"application/json; charset=utf-8",
                    dataType:"json",
                    data: blob,
                    xhr: function() {
                      var xhr = new window.XMLHttpRequest();
                      xhr.upload.addEventListener("progress", function(evt) {
                        if (evt.lengthComputable) {
                          var percentComplete = evt.loaded / evt.total;
                          NProgress.set(percentComplete);
                        }
                      }, false);
                      return xhr;
                    },
                    beforeSend : function(){
                      NProgress.start();
                    },
                    success: function(data, textStatus, jqXHR) {
                        $.notify(data, {
                            placement: {
                                from: "bottom",
                                align: "right"
                            }
                        });
                        NProgress.remove();
                        cambios = false;
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $.notify("Error al intentar guardar", {
                            placement: {
                                from: "bottom",
                                align: "right"
                            }
                        });
                        NProgress.remove();
                    }
                });

            });
        });

        d3.select("#download-input").on("click", function() {
            var envio = {
                "proyecto": proyecto,
                "nodes": thisGraph.nodes,
                "edges": thisGraph.edges,
                "workloader": workloader
            };
            var blob = new Blob([window.JSON.stringify(envio)], {
                type: "application/json;charset=utf-8"
            });
            saveAs(blob, "mydag.json");

        });

        d3.select("#upload-input").on("click", function() {
            document.getElementById("hidden-file-upload").click();
        });

        d3.select("#hidden-file-upload").on("change", function() {
            var reader = new FileReader();
            var blob = this.files[0];
            //var thisGraph = this;
            var win = this;
            reader.onload = function() {
                var txtRes = reader.result;
                try {
                    var jsonObj = JSON.parse(txtRes);
                    thisGraph.deleteGraph(true);
                    thisGraph.nodes = jsonObj.nodes;
                    thisGraph.setIdCt(jsonObj.nodes.length + 1);
                    thisGraph.edges = [];
                    var newEdges = jsonObj.edges;

                    function buscar(id) {
                        for (var i = 0; i < thisGraph.nodes.length; i++) {
                            if (thisGraph.nodes[i].id === id) {
                                return i;
                            }
                        }
                        return -1;
                    }
                    if (newEdges) {
                        for (var j = 0; j < newEdges.length; j++) {
                            thisGraph.edges.push({
                                source: thisGraph.nodes[buscar(newEdges[j].source.id)],
                                target: thisGraph.nodes[buscar(newEdges[j].target.id)]
                            });
                        }
                    }
                    window.nodes = thisGraph.nodes;
                    window.edges = thisGraph.egdes;
                    thisGraph.updateGraph();
                } catch (err) {
                    console.log("Error parsing uploaded file\nerror message: " + err.message);
                    return;
                }
            };
            reader.readAsText(blob);
        });


        // handle uploaded data
        d3.select("#run-input").on("click", function() {
            var saveEdges = [];
            thisGraph.edges.forEach(function(val, i) {
                saveEdges.push({
                  source: {id :val.source.id},
                  target: {id :val.target.id}
                });
            });
            if (thisGraph.nodes.length === 0) {
                alert("Debe haber al menos un programa");
                return;
            }
            for (var i = 0; i < thisGraph.nodes.length; i++) {
                var nodo = thisGraph.nodes[i];
                if (!nodo.configurado) {
                    alert("Todos los nodos deben representar un programa");
                    return;
                } else {
                    var nombre = nodo.configurado.name;
                    var validador = window[nombre]();
                    if (validador.validation(nodo.configurado.render)) {
                        nodo.configurado.argumento = validador.transformation(nodo.configurado.render);
                        if(nombre ==="raw"){
                          var raw = nodo.configurado.argumento;
                          nodo.configurado.location = raw.shift();
                          nodo.configurado.argumento = raw.join(" ");
                        }
                        else if(nombre ==="rawdocker"){
                          var rawdocker = nodo.configurado.argumento;
                          nodo.configurado.image = rawdocker.shift();
                          nodo.configurado.location = rawdocker.shift();
                          nodo.configurado.argumento = rawdocker.join(" ");
                        }
                    }else{
                      alert("Nodo "+nodo.title+" Invalido");
                      return;
                    }
                }
            }
            svgAsPngUri(document.getElementById("grafo"), {}, function(uri) {
                var envio = {
                    "proyecto": proyecto,
                    "nodes": thisGraph.nodes,
                    "edges": saveEdges,
                    "workloader": workloader,
                    "imagen": uri
                };
                var blob = JSON.stringify(envio);
                $.ajax({
                    type: "POST",
                    url: "/run",
                    contentType:"application/json; charset=utf-8",
                    dataType:"json",
                    data: blob,
                    xhr: function() {
                      var xhr = new window.XMLHttpRequest();
                      xhr.upload.addEventListener("progress", function(evt) {
                        if (evt.lengthComputable) {
                          var percentComplete = evt.loaded / evt.total;
                          NProgress.set(percentComplete);
                        }
                      }, false);
                      return xhr;
                    },
                    beforeSend : function(){
                      NProgress.start();
                    },
                  success: function(data, textStatus, jqXHR) {
                    var respuesta = {};
                    if(data.error){
                      respuesta.message = data.message;
                    }else{
                      respuesta.message = "Enviada a la cola: " + data.id;
                      respuesta.url = "/build?id=" + data.id;
                    }
                    $.notify(respuesta, {
                      placement: {
                        from: "bottom",
                        align: "right"
                      }
                    });
                    NProgress.remove();
                  },
                  error: function(jqXHR, textStatus, errorThrown) {
                    $.notify("Error del servidor", {
                      placement: {
                        from: "bottom",
                        align: "right"
                      }
                    });
                    NProgress.remove();
                  }
                });
            });
        });

        d3.select("#delete-graph").on("click", function() {
            thisGraph.deleteGraph(false);
        });

        function logger(tipo) {
            $.ajax({
                type: "POST",
                url: "/datanodedag",
                data: {
                    idEjecucion: ejecucion,
                    nodo: graph.state.selectedNode,
                    tipo: tipo
                },
                success: function(data, textStatus, jqXHR) {
                    $('#myModal').modal('toggle');
                    $('#infoo').html(data.split("\n").join("<br/>"));
                    var title = graph.state.selectedNode.title;
                    var titleUrl = encodeURIComponent(title);
                    var id = graph.state.selectedNode.id;
                    var url = "/datanodedag?idEjecucion="+ejecucion+"&title="+titleUrl+"&id="+id+"&tipo="+tipo;
                    $("#myModalLabel").text(title);
                    $("#seeall").attr("href", url);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    $.notify("Error al intentar obtener " + tipo, {
                        placement: {
                            from: "bottom",
                            align: "right"
                        }
                    });
                }
            });
        }

        d3.select("#log").on("click", function() {
            logger("log");
        });
        d3.select("#out").on("click", function() {
            logger("out");
        });
        d3.select("#err").on("click", function() {
            logger("err");
        });

        // handle delete graph
        d3.select("#delete-graph").on("click", function() {
            thisGraph.deleteGraph(false);
        });
    };

    GraphCreator.prototype.setIdCt = function(idct) {
        this.idct = idct;
    };

    GraphCreator.prototype.consts = {
        selectedClass: "selected",
        connectClass: "connect-node",
        circleGClass: "conceptG",
        graphClass: "graph",
        activeEditId: "active-editing",
        BACKSPACE_KEY: 8,
        DELETE_KEY: 46,
        ENTER_KEY: 13,
        nodeRadius: 50
    };

    /* PROTOTYPE FUNCTIONS */

    GraphCreator.prototype.dragmove = function(d) {
        var thisGraph = this;
        if (thisGraph.state.shiftNodeDrag) {
            thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);
        } else {
            d.x += d3.event.dx;
            d.y += d3.event.dy;
            thisGraph.updateGraph();
        }
    };

    GraphCreator.prototype.deleteGraph = function(skipPrompt) {
        var thisGraph = this,
            doDelete = true;
        if (!skipPrompt) {
            doDelete = window.confirm("¿Esta seguro querer eliminar el grafo?");
        }
        if (doDelete) {
            thisGraph.nodes = [];
            thisGraph.edges = [];
            nodes = thisGraph.nodes;
            edges = thisGraph.edges;
            thisGraph.updateGraph();
        }
    };

    /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
    GraphCreator.prototype.selectElementContents = function(el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    };


    /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
    GraphCreator.prototype.insertTitleLinebreaks = function(gEl, title) {
        var words = title.split(/\s+/g),
            nwords = words.length;
        var el = gEl.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-" + (nwords - 1) * 7.5);

        for (var i = 0; i < words.length; i++) {
            var tspan = el.append('tspan').text(words[i]);
            if (i > 0)
                tspan.attr('x', 0).attr('dy', '15');
        }
    };


    // remove edges associated with a node
    GraphCreator.prototype.spliceLinksForNode = function(node) {
        var thisGraph = this,
            toSplice = thisGraph.edges.filter(function(l) {
                return (l.source === node || l.target === node);
            });
        toSplice.map(function(l) {
            thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
        });
    };

    GraphCreator.prototype.replaceSelectEdge = function(d3Path, edgeData) {
        var thisGraph = this;
        d3Path.classed(thisGraph.consts.selectedClass, true);
        if (thisGraph.state.selectedEdge) {
            thisGraph.removeSelectFromEdge();
        }
        thisGraph.state.selectedEdge = edgeData;
    };

    GraphCreator.prototype.replaceSelectNode = function(d3Node, nodeData) {
        var thisGraph = this;
        d3Node.classed(this.consts.selectedClass, true);
        if (thisGraph.state.selectedNode) {
            thisGraph.removeSelectFromNode();
        }
        thisGraph.state.selectedNode = nodeData;
    };

    GraphCreator.prototype.removeSelectFromNode = function() {
        var thisGraph = this;
        thisGraph.circles.filter(function(cd) {
            return cd.id === thisGraph.state.selectedNode.id;
        }).classed(thisGraph.consts.selectedClass, false);
        thisGraph.state.selectedNode = null;
    };

    GraphCreator.prototype.removeSelectFromEdge = function() {
        var thisGraph = this;
        thisGraph.paths.filter(function(cd) {
            return cd === thisGraph.state.selectedEdge;
        }).classed(thisGraph.consts.selectedClass, false);
        thisGraph.state.selectedEdge = null;
    };

    GraphCreator.prototype.pathMouseDown = function(d3path, d) {
        var thisGraph = this,
            state = thisGraph.state;
        d3.event.stopPropagation();
        state.mouseDownLink = d;

        if (state.selectedNode) {
            thisGraph.removeSelectFromNode();
        }

        var prevEdge = state.selectedEdge;
        if (!prevEdge || prevEdge !== d) {
            thisGraph.replaceSelectEdge(d3path, d);
        } else {
            thisGraph.removeSelectFromEdge();
        }
    };

    // mousedown on node
    GraphCreator.prototype.circleMouseDown = function(d3node, d) {
        var thisGraph = this,
            state = thisGraph.state;
        d3.event.stopPropagation();
        state.mouseDownNode = d;
        if (d3.event.shiftKey) {
            state.shiftNodeDrag = d3.event.shiftKey;
            // reposition dragged directed edge
            thisGraph.dragLine.classed('hidden', false)
                .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
            return;
        }
    };

    /* place editable text on node in place of svg text */
    GraphCreator.prototype.changeTextOfNode = function(d3node, d) {
        var thisGraph = this,
            consts = thisGraph.consts,
            htmlEl = d3node.node();
        d3node.selectAll("text").remove();
        var nodeBCR = htmlEl.getBoundingClientRect(),
            curScale = nodeBCR.width / consts.nodeRadius,
            placePad = 5 * curScale,
            useHW = curScale > 1 ? nodeBCR.width * 0.71 : consts.nodeRadius * 1.42;
        // replace with editableconent text
        var d3txt = thisGraph.svg.selectAll("foreignObject")
            .data([d])
            .enter()
            .append("foreignObject")
            .attr("x", nodeBCR.left + placePad)
            .attr("y", nodeBCR.top + placePad)
            .attr("height", 2 * useHW)
            .attr("width", useHW)
            .append("xhtml:p")
            .attr("id", consts.activeEditId)
            .attr("contentEditable", "true")
            .text(d.title)
            .on("mousedown", function(d) {
                d3.event.stopPropagation();
            })
            .on("keydown", function(d) {
                d3.event.stopPropagation();
                if (d3.event.keyCode == consts.ENTER_KEY && !d3.event.shiftKey) {
                    this.blur();
                }
            })
            .on("blur", function(d) {
                d.title = this.textContent;
                thisGraph.insertTitleLinebreaks(d3node, d.title);
                d3.select(this.parentElement).remove();
            });
        return d3txt;
    };

    // mouseup on nodes
    GraphCreator.prototype.circleMouseUp = function(d3node, d) {
        var thisGraph = this,
            state = thisGraph.state,
            consts = thisGraph.consts;
        // reset the states
        state.shiftNodeDrag = false;
        d3node.classed(consts.connectClass, false);

        var mouseDownNode = state.mouseDownNode;
        if (!mouseDownNode) return;

        thisGraph.dragLine.classed("hidden", true);

        if (mouseDownNode !== d) {
            // we're in a different node: create new edge for mousedown edge and add to graph
            var newEdge = {
                source: mouseDownNode,
                target: d
            };

            var filtRes = thisGraph.paths.filter(function(d) {
                if (d.source === newEdge.target && d.target === newEdge.source) {
                    thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
                    // eliminarArista(d);
                }
                return d.source === newEdge.source && d.target === newEdge.target;
            });
            if (!filtRes[0].length) {
                //var r = agregarArista(mouseDownNode.id, d.id);
                thisGraph.edges.push(newEdge);
                if (KahnSAlgorithm(thisGraph)) {
                    var i = -1;
                    for (i = 0; i < thisGraph.edges.length; i++) {
                        if (thisGraph.edges[i].source.id == newEdge.source.id && thisGraph.edges[i].target.id == newEdge.target.id) {
                            break;
                        }
                    }
                    thisGraph.edges.splice(i, 1);
                }

                thisGraph.updateGraph();
            }
        } else {
            // we're in the same node
            if (state.justDragged) {
                // dragged, not clicked
                state.justDragged = false;
            } else {
                var nid = $("#nid");
                if(nid.length > 0){
                    var nimage = $("#nimage");
                    var nmodule = $("#nmodule");
                    var ntittle = $("#ntitle");
                    var ncommando = $("#ncomando");
                    var nwd = $("#nwd");
                    var ntimes = $("#ntimes");
                    var arent = $("#arent");
                    var arsal = $("#arsal");
                    var nnode = mouseDownNode;
                    nid.text(nnode.id);
                    nimage.text(nnode.configurado.image);
                    nmodule.text(nnode.configurado.module);
                    ntittle.text(nnode.tittle);
                    ncommando.text(nnode.configurado.location + " " + (nnode.configurado.argumento || ""));
                    nwd.text(nnode.configurado.wd);
                    ntimes.text(nnode.configurado.times);
                    arent.text(nnode.configurado.file.filter(function(f){return f.entrada;}).map(function(f){return f.filename;}).join("\n"));
                    arsal.text(nnode.configurado.file.filter(function(f){return !f.entrada;}).map(function(f){return f.filename;}));
                }

                /*var id = document.getElementById("id");*/
                menu.style.right = "0px";
                $("#opciones").empty();
                $("#mopciones").empty();
                var actualizar=true;
                //------------------------------------------------------------
                // clicked, not dragged
                if (d3.event.shiftKey) {
                    // shift-clicked node: edit text content
                    var d3txt = thisGraph.changeTextOfNode(d3node, d);
                    var txtNode = d3txt.node();
                    thisGraph.selectElementContents(txtNode);
                    txtNode.focus();
                } else {
                    if (state.selectedEdge) {
                        thisGraph.removeSelectFromEdge();
                    }
                    var prevNode = state.selectedNode;

                    if (!prevNode || prevNode.id !== d.id) {
                        thisGraph.replaceSelectNode(d3node, d);
                    } else {
                        thisGraph.removeSelectFromNode();
                        actualizar = false;
                    }
                }

                if (actualizar /*&& mouseDownNode.configurado*/) {
                    rederizarFormulario(mouseDownNode, "");
                } else {
                    $('#plantillaPrograma').val("");
                    rederizarProyecto();
                }
            }
        }
        state.mouseDownNode = null;
        return;

    }; // end of circles mouseup

    // mousedown on main svg
    GraphCreator.prototype.svgMouseDown = function() {
        this.state.graphMouseDown = true;
    };

    // mouseup on main svg
    GraphCreator.prototype.svgMouseUp = function() {
        var thisGraph = this,
            state = thisGraph.state;
        if (state.justScaleTransGraph) {
            // dragged not clicked
            state.justScaleTransGraph = false;
        } else if (state.graphMouseDown && d3.event.shiftKey) {
            // clicked not dragged from svg
            var xycoords = d3.mouse(thisGraph.svgG.node()),
                d = {
                    id: thisGraph.idct++,
                    title: "Nueva Tarea",
                    x: xycoords[0],
                    y: xycoords[1]
                };
            thisGraph.nodes.push(d);
            //agregarNodo(thisGraph.idct-1);
            thisGraph.updateGraph();
            // make title of text immediently editable
            var d3txt = thisGraph.changeTextOfNode(thisGraph.circles.filter(function(dval) {
                    return dval.id === d.id;
                }), d),
                txtNode = d3txt.node();
            thisGraph.selectElementContents(txtNode);
            txtNode.focus();
        } else if (state.shiftNodeDrag) {
            // dragged from node
            state.shiftNodeDrag = false;
            thisGraph.dragLine.classed("hidden", true);
        }
        state.graphMouseDown = false;
    };

    // keydown on main svg
    GraphCreator.prototype.svgKeyDown = function() {
        var thisGraph = this,
            state = thisGraph.state,
            consts = thisGraph.consts;
        // make sure repeated key presses don't register for each keydown
        if (state.lastKeyDown !== -1) return;
        var obj = d3.event.target;
        if(obj instanceof HTMLInputElement && obj.type == 'text') return;

        state.lastKeyDown = d3.event.keyCode;
        var selectedNode = state.selectedNode,
            selectedEdge = state.selectedEdge;

        switch (d3.event.keyCode) {
            case consts.BACKSPACE_KEY:
            case consts.DELETE_KEY:
                d3.event.preventDefault();
                if (selectedNode) {
                    thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
                    //eliminarNodo(selectedNode);
                    thisGraph.spliceLinksForNode(selectedNode);
                    state.selectedNode = null;
                    thisGraph.updateGraph();
                } else if (selectedEdge) {
                    thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
                    //eliminarArista(selectedEdge);
                    state.selectedEdge = null;
                    thisGraph.updateGraph();
                }
                break;
        }
    };

    GraphCreator.prototype.svgKeyUp = function() {
        this.state.lastKeyDown = -1;
    };

    // call to propagate changes to graph
    GraphCreator.prototype.updateGraph = function() {

        var thisGraph = this,
            consts = thisGraph.consts,
            state = thisGraph.state;

        thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function(d) {
            return String(d.source.id) + "+" + String(d.target.id);
        });
        var paths = thisGraph.paths;
        // update existing paths
        paths.style('marker-end', 'url(#end-arrow)')
            .classed(consts.selectedClass, function(d) {
                return d === state.selectedEdge;
            })
            .attr("d", function(d) {
                return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
            });

        // add new paths
        paths.enter()
            .append("path")
            .style('marker-end', 'url(#end-arrow)')
            .classed("link", true)
            .attr("d", function(d) {
                return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
            })
            .on("mousedown", function(d) {
                thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function(d) {
                state.mouseDownLink = null;
            });

        // remove old links
        paths.exit().remove();

        // update existing nodes
        thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function(d) {
            return d.id;
        });
        thisGraph.circles.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

        thisGraph.circles.classed(consts.circleGClass, true)
            .classed('notready', function(d) {
                return d.estado === "notready";
            })
            .classed('ready', function(d) {
                return d.estado === "ready";
            })
            .classed('prerun', function(d) {
                return d.estado === "prerun";
            })
            .classed('submitted', function(d) {
                return d.estado === "submitted";
            })
            .classed('postrun', function(d) {
                return d.estado === "postrun";
            })
            .classed('done', function(d) {
                return d.estado === "done";
            })
            .classed('error', function(d) {
                return d.estado === "error";
            });


        // add new nodes
        var newGs = thisGraph.circles.enter()
            .append("g");

        newGs.classed(consts.circleGClass, true)
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .on("mouseover", function(d) {
                if (state.shiftNodeDrag) {
                    d3.select(this).classed(consts.connectClass, true);
                }
            })
            .on("mouseout", function(d) {
                d3.select(this).classed(consts.connectClass, false);
            })
            .on("mousedown", function(d) {
                thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function(d) {
                thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
            })
            .call(thisGraph.drag);

        newGs.append("circle")
            .attr("r", String(consts.nodeRadius));

        newGs.each(function(d) {
            thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
        });

        // remove old nodes
        thisGraph.circles.exit().remove();
        if(numRend>0 && ejecucion === null){
            cambios = true;
        }
        numRend++;
    };

    GraphCreator.prototype.estado = function() {
        var i = 0;
        var thisGraph = this;
        //
        var estados = ["notready", "ready", "prerun", "submitted", "postrun", "done", "error"];
        if (ejecucion !== null) {
            function consultar(){
                $.ajax({
                    type: "POST",
                    url: "/statusdag",
                    data: {
                        idEjecucion: ejecucion
                    },
                    success: function(data, textStatus, jqXHR) {
                        thisGraph.nodes.map(function(nodo) {
                            var s = data[(nodo.title + "_" + nodo.id).replace(/[^a-z0-9]/gi, '_').toLowerCase()];
                            if (s) {
                                nodo.estado = estados[s.NodeStatus];
                                return nodo;
                            }
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.log("Fracaso: " + textStatus);
                    }
                });
                thisGraph.updateGraph();
            }
            consultar();
            setInterval(consultar, 5000);
        }
    };

    GraphCreator.prototype.zoomed = function() {
        this.state.justScaleTransGraph = true;
        d3.select("." + this.consts.graphClass)
            .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    };

    GraphCreator.prototype.updateWindow = function(svg) {
        var docEl = document.documentElement,
            bodyEl = document.getElementsByTagName('body')[0];
        var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
        var y = window.innerHeight || docEl.clientHeight || bodyEl.clientHeight;
        svg.attr("width", x).attr("height", y);
    };


    /**** MAIN ****/

    // warn the user when leaving
    window.onbeforeunload = function() {
        //return "Make sure to save your graph locally before leaving :-)";
    };

    var docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];

    var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
        height = window.innerHeight || docEl.clientHeight || bodyEl.clientHeight;

    var xLoc = width / 2 - 25,
        yLoc = 100;

    /** MAIN SVG **/
    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "grafo");
    graph = new GraphCreator(svg, nodes, edges);
    graph.updateGraph();
    graph.estado();

    $("#plantillaPrograma").on('change', function() {
        $("#opciones").empty();
        if (!graph.state.selectedNode)
            return;
        var id = graph.state.selectedNode.id;
        rederizarFormulario(graph.nodes[buscar(id)], this.value);
        graph.updateGraph();
        cambios = true;
    });
    /// Listeners
    $('#opciones').on('keydown', 'textarea', function(ev) {
      ev.stopPropagation();
    });
    $('#opciones').on('keydown', 'input', function(ev) {
      ev.stopPropagation();
    });
    $('#opciones').on('keyup', 'textarea', function(ev) {
        ev.stopPropagation();
        if (!graph.state.selectedNode || $(this).attr("id") === "argss")
            return;
        var id = graph.state.selectedNode.id;
        var nodo = graph.nodes[buscar(id)];
        cambiar($(this).attr('id').split("."), $(this).val(), nodo);
        cambios = true;
    });

    $('#opciones').on('keyup', 'input', function(ev) {
        ev.stopPropagation();
        if (!graph.state.selectedNode)
            return;
        var id = graph.state.selectedNode.id;
        var nodo = graph.nodes[buscar(id)];
        cambiar($(this).attr('id').split("."), $(this).val(), nodo);
        cambios = true;
    });

    $('#opciones').on("change", "input:checkbox", function() {
        if (!graph.state.selectedNode)
            return;
        var id = graph.state.selectedNode.id;
        var nodo = graph.nodes[buscar(id)];
        cambiar($(this).attr('id').split("."), this.checked, nodo);
        cambios = true;
    });

    $('#opciones').on('change', 'select', function() {
        if (!graph.state.selectedNode)
            return;
        var id = graph.state.selectedNode.id;
        var nodo = graph.nodes[buscar(id)];
        cambiar($(this).attr('id').split("."), $(this).val(), nodo);
        cambios = true;
    });

    $("#opciones").on("click", "label", function() {
        if (!graph.state.selectedNode)
            return;
        var id = graph.state.selectedNode.id;
        var nodo = graph.nodes[buscar(id)];
        var cartel = $(this);
        var para = "" + cartel.data('for');
        if (para && para != "undefined") {
            if (cartel.attr('class') === "add") {
                accion(para.split("."), false, nodo);
            } else {
                accion(para.split("."), true, nodo);
            }
        }
        cambios = true;
    });

    $('#mopciones').on('keydown', '#times', function(ev) {
        ev.stopPropagation();
    });

    $('#mopciones').on('change', '#times', function(ev) {
        ev.stopPropagation();
        if (!graph.state.selectedNode)
            return;
        var id = graph.state.selectedNode.id;
        var nodo = graph.nodes[buscar(id)];
        nodo.configurado.times = $(this).val();
        cambios = true;
    });

    $('#mopciones').on('keyup', '#wd', function(ev) {
        ev.stopPropagation();
        if (!graph.state.selectedNode)
            return;
        var id = graph.state.selectedNode.id;
        var nodo = graph.nodes[buscar(id)];
        nodo.configurado.wd = $(this).val();
        cambios = true;
    });

  $('#mopciones').on('click', '#gencmd', function(ev) {
    ev.stopPropagation();
    if (!graph.state.selectedNode)
      return;
    var id = graph.state.selectedNode.id;
    var nodo = graph.nodes[buscar(id)];
    var nombre = nodo.configurado.name;
    var validador = window[nombre]();
    var cmd = "Node invalid";
    var image = "";
    if (validador.validation(nodo.configurado.render)) {
      var raw = validador.transformation(nodo.configurado.render);
      cmd = "";
      if(nombre ==="rawdocker"){
        image = raw.shift();
        cmd = "Image: "+ image+", ";
      }
      else if (nodo.configurado.useDocker){
        image = nodo.configurado.image;
        cmd = "Image: "+ image+", ";
      }
      if (nombre !=="raw"){
        cmd += "Command: "+ nodo.configurado.location+ " ";
      }
      cmd += (typeof raw === "string")? raw : raw.join(" ");
    }
      //$("#menu").css("position", "static");
      $("#cmd").text(cmd);
      $('#cmdModal').modal('show');
  });

})(window.d3, window.saveAs, window.Blob);
