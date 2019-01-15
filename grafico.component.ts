import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Http, Response } from '@angular/http';
import * as mouses from '../instrument/eventMouse';
import { Chart } from 'angular-highcharts';
import {Observable} from 'rxjs/Rx';
import * as THREE from 'three';
import "../js/EnableThreeExamples";
import "three/examples/js/controls/OrbitControls";
import * as Scene from '../helpers/scene';
import * as map from "../instrument/createMapa";
import { InstrumentArrayService } from '../service/instrument-array.service';
import { FechaService } from '../service/fecha.service';
import { InstrumentosService } from '../service/instrumentos.service';
import { VariableService } from '../service/variable.service';
import { ConfigurationService } from '../service/configuration.service';

declare var jquery:any;
declare var $ :any;

import * as _ from 'underscore';
import { reverse } from 'dns';

let width: any;
let height: any;
let variable: any;


//let maps: object = map.coord();

var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
  /* your code here */
  console.log('mobile');
  width = window.innerWidth;
  height = 300;
} else {
  console.log('desktop');
  width = 600;
  height = null;
};

@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.component.html',
  styleUrls: ['./grafico.component.css'],
  providers : [ 
    InstrumentArrayService, 
    FechaService, 
    InstrumentosService, 
    VariableService, 
    ConfigurationService
  ]
})
export class GraficoComponent implements OnInit {

  // Obtener el ID del tag "sector"
  private url_string = window.location.href;
  private url = new URL(this.url_string);
  private c = this.url.searchParams.get("sector");
  private GROUP = new THREE.Group();

  Prismas;
  Inclinometros;
  Piezometros: any;
  Extensometros;
  Radar;
  Insar;
  Acelerometros;
  InstrumentIcon: Observable<Array<object>>;
  private activo;
  
  // Esta variable es ocupada para almacenar los instrumentos seleccionados
  private PrismasArray: Array<any> = [];
  
  
  constructor(
    private http:Http, 
    private instrumentArray: InstrumentArrayService, 
    private fecha: FechaService, 
    private Instrumentos: InstrumentosService, 
    private variable: VariableService,
    private configuration: ConfigurationService) {
    
  }
  

  async ngOnInit() {
    $('ul.tabs').tabs();
    this.request();
    let result = await this.configuration.getConfiguration();
    this.graphicPath(result);
    
  }


  graphicPath(result) {
    //console.log(result);
    
    let rowInst: any = [];
    let esto = this;
    (result.tipos_instrumentos).forEach(entry => {
      let strName = entry.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
      rowInst.push({ 
        nombre : '#Ins'+strName,
        icon : entry.icono,
        name : 'Ins'+strName,
        instrument : strName
      })

      $("#InstrumentTabs li a[href='#Ins"+strName+"']").parent()[0].style.display = 'block';
      console.log($("#InstrumentTabs li a[href='#Ins"+strName+"']").parent()[0]);
              

    });
    this.InstrumentIcon = rowInst;
    //console.log(this.InstrumentIcon);
  }

  


  createChart(obj) {
    
    let interval;
    switch($("#select-periodo option:selected").text()) {
      case 'Mensual':
      interval = 30 * 24 * 3600 * 1000;
      break;
      case 'Semestral':
      interval = 30 * 24 * 3600 * 1000;
      break;
      case 'Anual':
      interval = 30 * 24 * 3600 * 1000;
      break;
    }



    let element = new Chart({
      chart: { 
        resetZoomButton: {
          theme: {
              display: 'none'
          }
        },
        zoomType: 'xy',
        width: width,
        height: height,
        type: obj.type,
        inverted: obj.revers,
        events : {
          drillup : function(e) {
            console.log(this);
            this.options.drilldown.series = [];  
            $("#clear").css("display","block");
          },
          drilldown : obj.clickEvent
        }
      },
      title: {
        align: 'left',
        text: obj.title,
        style: {
          fontSize : '15px'
        }
      },
      xAxis: {
        type : obj.dataType, 
        tickPixelInterval: 100,
        dateTimeLabelFormats: {
          month: '%e. %b',
          year: '%b'
        },
        title: {
          text: obj.titleX
        },
        reversed: obj.inverted,
        labels : {
          formatter : obj.formatterX
        }
      },
      
      yAxis: {
        min : obj.escala.min,
        max : obj.escala.max,
        title: {
          text: obj.titleY
        },
        labels : {
          formatter : obj.formatterY
        }
      },
      tooltip: {
        valueDecimals: 2,
        headerFormat: '<b>{series.name}</b><br>',
        pointFormat: obj.pointFormat//'{point.x: %e. %b}: {point.y:.2f}'
      },
      plotOptions: {
        series: {
          turboThreshold: 20000,
         // lineWidth: 0,
          cursor: 'pointer',
          marker: {
            symbol : 'circle'
          },
          events : {
           // click : obj.clickEvent
          },
          dataLabels: {
              enabled: false
          }
        }
      },
      drilldown : {
          series: [],
          drillUpButton: {
            position : {
              //align : 'left'
            }
          }
      },
      credits: {
        enabled: false
      },
      exporting: {
        allowHTML: true
      }
    });

    return element;

  }

  selectInstrument(params) {
    
    switch(params.select) {
      case 'Prismas':
        this.Prismas = this.createChart({
          type : 'line',
          revers : params.revers,
          dataType : params.dataType,
          title : params.title + ' ('+params.unidad+')',
          titleX : 'Fecha',
          titleY : '('+params.unidad+')',
          pointFormat : '{point.x: %e. %b}: {point.y:.2f} '+params.unidad,
          escala : { min : null, max : null },
          inverted : false,
          formatterX : null,
          formatterY : function() {
            return this.value;
          }
        });
      break;

      case 'Piezometros':
        let Rangos = { min : params.valor-5, max : params.valor+5 }

        this.Piezometros = this.createChart({
          type : 'scatter',
          revers : params.revers,
          dataType : params.dataType,
          title : params.title + ' ('+params.unidad+')',
          titleX : 'Fecha',
          titleY : '('+params.unidad+')',
          inverted : false,
          pointFormat : '{point.x: %e. %b}: {point.y:.'+params.decimal+'f} '+params.unidad,
          escala : Rangos,
          formatterX : null,
          formatterY : function() {
            return this.value;
          }
        });

        // Dejamos por defecto el chart:type
        $("#InsPiezometros select").val('scatter');

      break;

      case 'Acelerometros':
        this.Acelerometros = this.createChart({
          //type : 'scatter',
          revers : params.revers,
          dataType : null,
          title : params.title + ' ('+params.unidad+')',
          titleY : '('+params.unidad+')',
          titleX : 'Fecha',//'h:m:s',
          inverted : false,
          pointFormat : '{point.x: %e. %b}: {point.y:.2f} '+params.unidad,
          escala : { min : null, max : null },
          formatterX : function() {
            //var options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
            let newLin = new Date(this.value).toLocaleDateString('es-ES', { day: 'numeric', month : 'short' });
            return newLin;
          },
          formatterY : function() {
            return this.value;
          },
          clickEvent : (e) => {
           
            $("#clear").css("display","none");
            this.Acelerometros.ref.showLoading('Cargando información para ' + e.point.series.name);
            let el: string = e.point.drilldown.toString();
            let drilldown: any = [];
            let url_detalle = 'http://192.168.102.23/servicioarisg/arisg.dll?id_tipo_instrumento=6&tipo_info=detalles&lectura='+e.point.drilldown+'&nombre_interno='+this.Acelerometros.ref.series[0].name;
            console.log(url_detalle);
            this.http.get(url_detalle).subscribe(

              (result: Response) => {
                  if(result.json().length == 0) {
                    this.Acelerometros.ref.showLoading('La lectura no tiene detalle');
                    setTimeout(() => {
                      this.Acelerometros.ref.hideLoading();
                      $("#clear").css("display","block");
                    }, 3000);
                    return false;
                  }
                  if (!e.seriesOptions) {
                    /*
                    drilldown.push({
                      type : 'line',
                      name : result.json()[0].name,
                      data : result.json()[0].data
                    });
                    */

                    (result.json()).forEach((entry) => {
                      let color = entry.color.toString().replace(/\[/g,'').replace(/\]/g,'');
                      drilldown.push({
                        type : 'line',
                        color : "rgb("+color+")",
                        name : entry.name,
                        data : entry.data
                      });
                    });
                    
                    let drilldowns = {
                      [el] : drilldown
                    },
                    series = drilldowns[e.point.drilldown];
                    this.Acelerometros.ref.hideLoading();
                    this.Acelerometros.ref.addSingleSeriesAsDrilldown(e.point, series[0]);
                    this.Acelerometros.ref.addSingleSeriesAsDrilldown(e.point, series[1]);
                    this.Acelerometros.ref.addSingleSeriesAsDrilldown(e.point, series[2]);
                    this.Acelerometros.ref.applyDrilldown();
                 
                  }
              
              }
            );
            

           
            
          }
        });

    
      break;


      case 'Inclinometros':
        this.Inclinometros = this.createChart({
          type : 'line',
          revers : params.revers,
          dataType : params.dataType,
          title : params.title + ' ('+params.unidad+')',
          titleY : '('+params.unidad+')',
          titleX : params.distancia,
          inverted : false,
          pointFormat : '{point.y:.2f} '+params.unidad,
          escala : { min : null, max : null },
          formatterX : function() {
            return this.value;
          },
          formatterY : function() {
            return this.value+'';
          }
        });

      
      break;

      case 'Extensometros':
        this.Extensometros = this.createChart({
          type : 'line',
          revers : params.revers,
          dataType : params.dataType,
          title : params.title + ' ('+params.unidad+')',
          titleY : '('+params.unidad+')',
          titleX : 'Fecha',
          inverted : false,
          pointFormat : '{point.y:.2f} '+params.unidad,
          escala : { min : null, max : null },
          formatterX : null,
          formatterY : function() {
            return this.value;
          }
        });
      break;

      case 'Radar': 
      this.Radar = this.createChart({
        type : 'line',
        revers : params.revers,
        title : params.title + ' ('+params.unidad+')',
        titleX : 'Fecha',
        titleY : '('+params.unidad+')',
        dataType : params.dataType,
        inverted : false,
        pointFormat : '{point.x: %e. %b}: {point.y:.2f} '+params.unidad,
        escala : { min : null, max : null },
        formatterX : null,
        formatterY : function() {
          return this.value;
        }
      });
      break;

      case 'Insar':
      this.Insar = this.createChart({
        type : 'line',
        revers : params.revers,
        title : params.title + ' ('+params.unidad+')',
        titleX : 'Fecha',
        titleY : '('+params.unidad+')',
        dataType : params.dataType,
        inverted : false,
        pointFormat : '{point.x: %e. %b}: {point.y:.2f} '+params.unidad,
        escala : { min : null, max : null },
        formatterX : null,
        formatterY : function() {
          return this.value;
        }
      });
      break;
    }
    
  }

  

 
  request(): any  {
    let firstValue: any = [];
    let self: GraficoComponent = this;
    let estado: string = 'close';
    let IdInstrument: Number;
    
    let containerGraphic = document.getElementById('dibujo');
    //let graphic = document.getElementById('graphicElement');
    let graphic: any = document.getElementsByClassName("graphicElement");
    let dataInstrument: any = mouses.addInstrument();

    // Obtenemos el elemento Tooltip
    let tipCanvas: any = document.getElementById("tip");

    let buttonGrafic = document.getElementById('graphic');

    
    // Este evento Custom proviene del modulo eventMouse /app/instrument/eventMouse.ts
    window.addEventListener('click:event', (ev: any) => {
      
      let existInstrument = _.find(self.PrismasArray, function(obj) { return obj.instrumento == ev.detail.state })
      //console.log(existInstrument);
      if(existInstrument) {
        EventClick();
      } else {
        if(ev.detail.condition == 2) {
          EventClick();
        }
      }
    });

    // indice para obtener el max y min de los valores en Piezometros
    let indice = 0;

    let minData: any = [];
    let maxData: any = [];
    
    function EventClick() {
      IdInstrument = dataInstrument.type;
      //console.log(dataInstrument);
      let fecha = self.fecha.getFecha();
      if(fecha.desde == '') {

        $('.modales').modal();
        $('.modales').modal('open');

        return false;

      }
      
      /*
        Cargamos el grafico, diferenciando los inclinometros del resto de instrumentos
        Consultamos si el array ya tiene un instrumento cargado en el grafico
      */
      switch(dataInstrument.type) {
        case 5:
          // Buscamos en el array si existe otro instrumento de Tipo 5 seleccionado
          let exist = _.find(self.PrismasArray, function(obj) { return obj.instrumento == dataInstrument.type })
          if(exist) {
            if(exist.name == dataInstrument.nombre) {
              Scene.resScene().remove( exist.donut );
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name == exist.name; });
              self.Inclinometros.removeSerie(0);
              self.Inclinometros.removeSerie(0);
              $("#InsInclinometros div").html('');
              return false;
            } else {
              Scene.resScene().remove( exist.donut );
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name == exist.name; });
              self.selectInstrument({
                select : 'Inclinometros',
                revers : true,
                dataType : null,
                title: dataInstrument.variable,
                unidad : dataInstrument.unidad,
                distancia : dataInstrument.u_distancia,
                decimal : dataInstrument.decimal
              })
            }
          } else {
            self.selectInstrument({
              select : 'Inclinometros',
              revers : true,
              dataType : null,
              title : dataInstrument.variable,
              unidad : dataInstrument.unidad,
              distancia : dataInstrument.u_distancia,
              decimal : dataInstrument.decimal
            })

            
          }
        break;

        case 1:
          // Buscamos si existe un Prisma en el array, si no existe creamos el grafico.
          let searchPrismas = _.find(self.PrismasArray, function(obj) { return obj.instrumento == dataInstrument.type })
          //console.log(searchPrismas);
          if(!searchPrismas) {
            self.selectInstrument({
              select : 'Prismas',
              revers : false,
              dataType : 'datetime',
              title: dataInstrument.variable,
              unidad : dataInstrument.unidad,
              decimal : dataInstrument.decimal
            })
          }
        break;

        case 2:
          let searchPiezometros = _.find(self.PrismasArray, function(obj) { return obj.instrumento == dataInstrument.type })

          if(!searchPiezometros) {
            self.selectInstrument({
              select : 'Piezometros',
              revers : false,
              dataType : 'datetime',
              title: dataInstrument.variable,
              unidad : dataInstrument.unidad,
              decimal : dataInstrument.decimal,
              valor : dataInstrument.valor
            })
          }

        break;

        case 3:
          let searchExtensometros = _.find(self.PrismasArray, function(obj) { return obj.instrumento == dataInstrument.type })
          //console.log(searchExtensometros);
          if(!searchExtensometros) {
            self.selectInstrument({
              select : 'Extensometros',
              revers : false,
              dataType : 'datetime',
              title: dataInstrument.variable,
              decimal : dataInstrument.decimal,
              unidad : dataInstrument.unidad,
              valor : dataInstrument.valor
            })
          }
        break;

        case 11:
          let searchRadares =  _.find(self.PrismasArray, function(obj) { return obj.instrumento == dataInstrument.type })
          if(!searchRadares) {
            self.selectInstrument({
              select : 'Radar',
              revers : false,
              dataType : 'datetime',
              title: dataInstrument.variable,
              unidad : dataInstrument.unidad,
              decimal : dataInstrument.decimal
            })
          }
        break;
        case 12:
          let searchInsar =  _.find(self.PrismasArray, function(obj) { return obj.instrumento == dataInstrument.type })
          if(!searchInsar) {
            self.selectInstrument({
              select : 'Insar',
              revers : false,
              dataType : 'datetime',
              title: dataInstrument.variable,
              unidad : dataInstrument.unidad,
              decimal : dataInstrument.decimal
            })
          }
        break;
        case 6:
          let searchAcelerometros = _.find(self.PrismasArray, function(obj) { return obj.instrumento == dataInstrument.type })
          if(!searchAcelerometros) {
            self.selectInstrument({
              select : 'Acelerometros',
              revers : false,
              dataType : 'datetime',
              title : dataInstrument.variable,
              unidad : dataInstrument.unidad,
              decimal : dataInstrument.decimal
            })
          }
        break;
      }
        
      tipCanvas.style.display = 'none';

      let obj = _.find(self.PrismasArray, function(obj) { return obj.name == dataInstrument.nombre })
      if(obj) {
        Scene.resScene().remove( obj.donut );
        self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name == dataInstrument.nombre; });
        // Buscamos en el Array de Series del Chart, para obtener el index y eliminarlo del gráfico
        let result: any = { index: 0 };
        
        // Eliminamos la serie del gráfico, pero filtramos por tipo de instrumento
        switch(dataInstrument.type) {
          case 1:
            result = _.find(self.Prismas.ref.series, function(serie) { return serie.name == dataInstrument.nombre; });
            self.Prismas.removeSerie(result.index);
            if(self.Prismas.ref.series.length == 0) {
              $("#InsPrismas div").html('');
            }
          break;

          case 2:
          //console.log(dataInstrument.nombre);
            result = _.find(self.Piezometros.ref.series, function(serie) { return serie.name == dataInstrument.nombre; });
            
            let DeleteMinData = Math.min.apply(null, result.options.data.map(item => item.y));
            let DeleteMaxData = Math.max.apply(null, result.options.data.map(item => item.y));
            minData = minData.filter(function(item){
              return item != DeleteMinData;
            });
            maxData = maxData.filter(function(item){
              return item != DeleteMaxData;
            });

            self.Piezometros.removeSerie(result.index);
            
            if(self.Piezometros.ref.series.length == 1) {
              let lastSerie = _.find(firstValue, function(serie: any) { return serie.name == self.Piezometros.ref.series[0].name; });
              
              self.Piezometros.ref.yAxis[0].update({
                max : lastSerie.valor+5
              });

              self.Piezometros.ref.yAxis[0].update({
                min : lastSerie.valor-5
              });

            }
            //result = _.find(self.Piezometros.ref.series, function(serie) { return serie.name == "Max "+dataInstrument.nombre; });
            //self.Piezometros.removeSerie(result.index);
            //result = _.find(self.Piezometros.ref.series, function(serie) { return serie.name == "Min "+dataInstrument.nombre; });
            //self.Piezometros.removeSerie(result.index);
            if(self.Piezometros.ref.series.length == 0) {
              $("#InsPiezometros div").html('');
            }
          break;

          case 3:
            result = _.find(self.Extensometros.ref.series, function(serie) { return serie.name == dataInstrument.nombre; });
            self.Extensometros.removeSerie(result.index);
            if(self.Extensometros.ref.series.length == 0) {
              $("#InsExtensometros div").html('');
            }
          break;

          case 11:
            result =_.find(self.Radar.ref.series, function(serie) { return serie.name == dataInstrument.nombre; })
            self.Radar.removeSerie(result.index);
            if(self.Radar.ref.series.length == 0) {
              $("#InsRadar div").html('');
            }
          break;

          case 12:
            result =_.find(self.Insar.ref.series, function(serie) { return serie.name == dataInstrument.nombre; })
            self.Insar.removeSerie(result.index);
            if(self.Insar.ref.series.length == 0) {
              $("#InsInsar div").html('');
            }
          break;

          case 6:
            result =_.find(self.Acelerometros.ref.series, function(serie) { return serie.name == dataInstrument.nombre; })
            self.Acelerometros.removeSerie(result.index);
            if(self.Acelerometros.ref.series.length == 0) {
              $("#InsAcelerometros div").html('');
            }
          break;
        }
        
        if(self.PrismasArray.length == 0) {
          for(var i = 0; i<graphic.length;i++) {
            graphic[i].style.display = "none";
          }
          
          $('#dibujo').animate({
            width : '30px',
            height : '30px'
          }, 500);

          estado = 'close';
        }
        

      } else {

        // Conectamos con el servicio para obtener los datos de cada instrumento
        let url: string;
        
        //console.log(dataInstrument);
        if(dataInstrument.type == 11 || dataInstrument.type == 12) {
          // desde='+fecha.desde+'&hasta='+fecha.hasta
          url = 'http://192.168.102.23/servicioarisg/arisg.dll?sector='+self.c+'&nombre_interno='+dataInstrument.nombre+'&id_tipo_instrumento='+dataInstrument.type+'&desde='+self.fecha.getFecha().desde+'&hasta='+self.fecha.getFecha().hasta+'&variable='+dataInstrument.id_variable+'&posx='+dataInstrument.position.x+'&posy='+dataInstrument.position.y+'&muestreo='+self.fecha.getFecha().periodo;
        } else if(dataInstrument.type == 6) {
          url = 'http://192.168.102.23/servicioarisg/arisg.dll?nombre_interno='+dataInstrument.nombre+'&id_tipo_instrumento='+dataInstrument.type+'&desde='+self.fecha.getFecha().desde+'&hasta='+self.fecha.getFecha().hasta+'&variable='+dataInstrument.id_variable;
        } else {
          url = 'http://192.168.102.23/servicioarisg/arisg.dll?nombre_interno='+dataInstrument.nombre+'&id_tipo_instrumento='+dataInstrument.type+'&desde='+self.fecha.getFecha().desde+'&hasta='+self.fecha.getFecha().hasta+'&muestreo='+self.fecha.getFecha().periodo+'&variable='+dataInstrument.id_variable;
        }

        console.log(url);

        self.http.get(url).subscribe(
          (respuesta: Response) => {
            //console.log(respuesta.json());
            switch(dataInstrument.type) {
              case 5:
                if(respuesta.json().data.length == 0) {
                  $(".vacio").modal();
                  $("#msjalert").text('El instrumento no tiene datos para el periodo seleccionado');
                  $(".vacio").modal('open');
                  return false;
                }
              break;
              case 1:
              case 2:
              case 3:
              case 6:
              case 11:
              case 12:
                if(respuesta.json().length == 0) {
                  $(".vacio").modal();
                  $("#msjalert").text('El instrumento no tiene datos para el periodo seleccionado');
                  $(".vacio").modal('open');
                  return false;
                }
              break;
            }

            let row = { IdInstrument: dataInstrument.type, fecha: '', name: '', data: [], type: '' };
            let rowMin = { IdInstrument: dataInstrument.type, fecha: '', name: 'min', data: [], type: '', marker: { enabled: false } };
            let rowMax = { IdInstrument: dataInstrument.type, fecha: '', name: 'max', data: [], type: '', marker: { enabled: false } };
            let datas: any = { x : 0, y: 0 };
            row.name = dataInstrument.nombre;
      
            let datos = respuesta.json();
            if(dataInstrument.type == 5) {
              //console.log(datos);
              $("#InstrumentTabs li a[href='#InsInclinometros']").click();
              
              //console.log(datos);

              (datos.data).forEach((item) => {
                //console.log(item.date);
                let bool = true;
                let fechaFinal;
                if(item.date==-2){
                  fechaFinal = "Min";
                  bool = false;
                }
                else if(item.date==-1){
                  fechaFinal = "Max";
                  bool = false;
                }
                else{
                  let fechaName = new Date(parseInt(item.date)*1000);
                  fechaFinal = fechaName.getDate() + '/' + (fechaName.getMonth()+1) + '/' + fechaName.getFullYear();
                  //console.log(fechaName.getMonth());                  
                }

                self.Inclinometros.addSerie({ name : fechaFinal, data : item.values, marker: { enabled: bool } });
                //console.log(dataInstrument.decimal);
              });
             

              
            } else {
              rowMin.name = "Min "+row.name;
              rowMax.name = "Max "+row.name;

              // obtenemos el resto de instrumentos para crear el array
              let minimo = Number.MAX_SAFE_INTEGER;
              let maximo = Number.MIN_SAFE_INTEGER;
              let valMinimo = Number.MAX_VALUE;
              let valMaximo = Number.MIN_VALUE;
              
              datos.forEach(entry => {

                let series = [];
                let utcSeconds = parseInt(""+entry.date+"");

                if(utcSeconds == -2) {
                  valMinimo = entry.value;
                }
                else if(utcSeconds == -1) {
                  valMaximo = entry.value;
                } else {
                  
                  //console.log(entry.date);
                  let d = new Date(utcSeconds*1000);
                  row.fecha = entry.date;

                  if( utcSeconds < minimo) {
                    minimo = utcSeconds;
                  }
                  if( utcSeconds > maximo) {
                    maximo = utcSeconds;
                  }                  
                  
                  datas.x = Date.UTC(   
                                        d.getFullYear(),
                                        d.getMonth(),
                                        d.getDate(),
                                        d.getHours(),
                                        d.getMinutes(),
                                        d.getSeconds()
                                    );
                                      
                  //datas.name = entry.date;
                  datas.y = entry.value;
                  //datas.drilldown = entry.date;                    
                  //series[0] = entry.date;                    
                  series[1] = entry.value;
                 // console.log(typeof entry.date);
                  if(dataInstrument.type == 6) {
                    row.data.push({x: datas.x, y: entry.value, drilldown: entry.date.toString()});
                    //console.log(dataInstrument.decimal);
                  } else {
                    //console.log('DECIMAL: ' + dataInstrument.decimal);
                    let fixed = entry.value.toFixed(dataInstrument.decimal);
                    //console.log('ULTIMO VALOR: ' + fixed);
                    row.data.push({x: datas.x, y: parseFloat(fixed)});
                    //console.log(fixed);
                  }
                }                   
              });

              if(valMinimo < valMaximo && minimo < maximo){
                
                rowMin.data.push({x: new Date(minimo*1000), y: valMinimo});
                rowMin.data.push({x: new Date(maximo*1000), y: valMinimo});
                rowMax.data.push({x: new Date(minimo*1000), y: valMaximo});
                rowMax.data.push({x: new Date(maximo*1000), y: valMaximo});
               // console.log(minimo + ' - ' + maximo);
                
              }
            
              // agregamos el instrumento al grafico
              switch(dataInstrument.type) {
                case 1:
                  $("#InstrumentTabs li a[href='#InsPrismas']").click();  
                  //console.log($("#InstrumentTabs li a[href='#InsPrismas']").html());
                  self.Prismas.addSerie(row);
                break;

                case 2:
                  $("#InstrumentTabs li a[href='#InsPiezometros']").click();  
                  //console.log(self.Piezometros.ref.series.length);
                  console.log(row);
                  minData.push(Math.min.apply(null, row.data.map(item => item.y)));
                  maxData.push(Math.max.apply(null, row.data.map(item => item.y)));
                  console.log(minData);
                  if(self.Piezometros.ref.series.length > 0) {
                    
                    self.Piezometros.addSerie(row);
                    firstValue.push({ name : dataInstrument.nombre, valor : dataInstrument.valor });

                    self.Piezometros.ref.yAxis[0].setExtremes(null, null);
                    self.Piezometros.ref.yAxis[0].update({
                      min : Math.min.apply(null, minData) - 5
                    });
                    
                    self.Piezometros.ref.yAxis[0].update({
                      max : Math.max.apply(null, maxData) + 5
                    });
                    
                    
                  } else {
                    self.Piezometros.addSerie(row);
                    firstValue.push({ name : dataInstrument.nombre, valor : dataInstrument.valor });
                    $("#InsPiezometros select").on('change', (event) => {
                      console.log(event.target.value);
                      self.Piezometros.ref.update({
                        chart : {
                          type: event.target.value
                        }
                      });
                      
                    });
                  }
                
                  if(rowMin.data.length>0){
                    self.Piezometros.addSerie(rowMin);
                  }
                  if(rowMax.data.length>0){
                    rowMax.type = 'line';
                    self.Piezometros.addSerie(rowMax);
                  }
                break;

                case 3:
                  $("#InstrumentTabs li a[href='#InsExtensometros']").click();  
                  self.Extensometros.addSerie(row);
                break;

                case 11:
                  $("#InstrumentTabs li a[href='#InsRadar']").click();  
                  self.Radar.addSerie(row);
                break;

                case 12:
                  $("#InstrumentTabs li a[href='#InsInsar']").click();  
                  self.Insar.addSerie(row);
                break;

                case 6:
                  $("#InstrumentTabs li a[href='#InsAcelerometros']").click();  
                  row.type = 'scatter';
                  self.Acelerometros.addSerie(row);
                  if(rowMin.data.length>0){
                    self.Acelerometros.addSerie(rowMin);
                  }
                  if(rowMax.data.length>0){
                    self.Acelerometros.addSerie(rowMax);                    
                  }                  
                  
                break;
              }
              
            }

            if(estado == 'close') {
              for(var i = 0; i<graphic.length;i++) {
                graphic[i].style.display = "block";
                //console.log(i);
              }
              
              //console.log('sigue aqui');
              $('#dibujo').animate({
                width : $('#dibujo').get(0).scrollWidth,
                //width : '300px',
                height : $('#dibujo').get(0).scrollHeight
              }, 500);

              estado = 'open';
              //console.log('ahora esta abrierto');
            } else {
              
              //console.log('ahora esta cerrado');
              
            }
            
            
          }
        );

        // Dibujamos una donut en el instrumento seleccionado
        /*
        let radius = 40;
        let tubeRadius = 10;
        let radialSegments = 8 * 10;
        let tubularSegments = 6 * 15;
        let arc = Math.PI * 3;
        let geometry = new THREE.TorusGeometry( radius, tubeRadius, radialSegments, tubularSegments, arc );
        let material =  new THREE.MeshLambertMaterial( { color : 0xffffff } );
        let mesh = new THREE.Mesh( geometry, material );
        //mesh.position.set(-(map.coord().x-dataInstrument.position.x), -(map.coord().y-dataInstrument.position.y), -(map.coord().z-dataInstrument.position.z));
        mesh.position.set(-(map.coord().x-dataInstrument.position.x), -(map.coord().y-dataInstrument.position.y),0);
        Scene.resScene().add( mesh );
        mesh.scale.set(5,5,5);

        console.log(mesh);
        console.log(-(map.coord().x-dataInstrument.position.x));
        */
        let png;
        let sprite;
        if(dataInstrument.type == 2) {
          png = '2-sel.png';
          var spriteMap = new THREE.TextureLoader().load( "assets/others/" + png );
          var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0xffffff, fog: true });
          sprite = new THREE.Sprite( spriteMaterial );
        } else if(dataInstrument.type == 3) {
          png = '3-sel.png';
          var spriteMap = new THREE.TextureLoader().load( "assets/others/" + png );
          var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0xffffff, fog: true });
          sprite = new THREE.Sprite( spriteMaterial );
        } else if(dataInstrument.type == 11 || dataInstrument.type == 12) {
          png = '1-sel.png';
          var geometry = new THREE.SphereGeometry( 5, 32, 32 );
          var material = new THREE.MeshBasicMaterial( {color: 0xffffff} );
          sprite = new THREE.Mesh( geometry, material );
        } else {
          png = '1-sel.png';
          var spriteMap = new THREE.TextureLoader().load( "assets/others/" + png );
          var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0xffffff, fog: true });
          sprite = new THREE.Sprite( spriteMaterial );
        }

        

        let posX, posY, posZ;
        
        if(dataInstrument.type == 11 || dataInstrument.type == 12) {
          posX = dataInstrument.point.x;
          posY = dataInstrument.point.y;
          posZ = dataInstrument.point.z;
          console.log("instrument: " + dataInstrument.point.z);
          console.log("sprite: " + posZ);
          //posZ = 15.0;
        } else {
          posX = -(map.coord().x-dataInstrument.ubicacion.x);
          posY = -(map.coord().y-dataInstrument.ubicacion.y);
          posZ = -(map.coord().z-dataInstrument.ubicacion.z);
        }
        //sprite.position.set(-(map.coord().x-dataInstrument.ubicacion.x), -(map.coord().y-dataInstrument.ubicacion.y),-(map.coord().z-dataInstrument.ubicacion.z))
        sprite.position.set(posX, posY, posZ);
        Scene.resScene().add( sprite );
        

        sprite.name = 'select';
        sprite.tipo = dataInstrument.type;
        sprite.material.dispose();

        console.log(dataInstrument);

        
        let EventAce = new CustomEvent('createfoto', { 
          detail: {
            sprites : { children : [sprite] }
          }
        });
        
        window.dispatchEvent(EventAce);
        
        

        // Agregamos al array el nuevo instrumento (Prismas, Piezometros, etc) seleccionado
        self.PrismasArray.push({instrumento: dataInstrument.type, name : dataInstrument.nombre, donut: sprite});
        
        // Agregamos el nuevo instrumento seleccionado al servicio
        self.instrumentArray.setInstrumentArray(self.PrismasArray);

      }
    }

    buttonGrafic.addEventListener('click', EventClick);

    // Evento para cerrar y abrir el gráfico, desde el icono superior derecho
    let iconGraphic = document.getElementById('iconGraphic');
    iconGraphic.addEventListener('click', function() {

      if(estado == 'open') {
        // El grafico esta abierto
        for(var i = 0; i<graphic.length;i++) {
          graphic[i].style.display = "none";
        }
        //graphic.style.display = 'none';
          
        $('#dibujo').animate({
          width : '30px',
          height : '30px'
        }, 500);

        estado = 'close';

      } else {
        // El grafico esta cerrado
        if(self.PrismasArray.length > 0) {
          for(var i = 0; i<graphic.length;i++) {
            graphic[i].style.display = "block";
          }

          $('#dibujo').animate({
            width : $('#dibujo').get(0).scrollWidth,
            height : $('#dibujo').get(0).scrollHeight
          }, 500);

          estado = 'open';
        }
      }
    });



    // Evento para limpiar la selección completa
    let limpiar = document.getElementById('clear');
    limpiar.addEventListener('click', function() {
      
      self.PrismasArray.forEach(function(entry) {
        Scene.resScene().remove( entry.donut );
        let result: any = { index: 0 };
        // Removemos los donuts del canvas
        Scene.resScene().remove( entry.donut );
        // Eliminamos las series de los gráficos
        switch(entry.instrumento) {
          case 5:
          let large = self.Inclinometros.ref.series.length;
          for(let i=0;i<large;i++) {
            //console.log(i);
            self.Inclinometros.removeSerie(0);
          };
          $("#InsInclinometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
          break;
          case 1:
          result = _.find(self.Prismas.ref.series, function(serie) { return serie.name == entry.name; });
          self.Prismas.removeSerie(result.index);
          break;
          case 2:
          result = _.find(self.Piezometros.ref.series, function(serie) { return serie.name == entry.name; });
          self.Piezometros.removeSerie(result.index);
          break;
          case 3:
          result = _.find(self.Extensometros.ref.series, function(serie) { return serie.name == entry.name; });
          self.Extensometros.removeSerie(result.index);
          break;
          case 6:
          result = _.find(self.Acelerometros.ref.series, function(serie) { return serie.name == entry.name; });
          self.Acelerometros.removeSerie(result.index);
          $("#InsAcelerometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
          break;
          case 11:
          result = _.find(self.Radar.ref.series, function(serie) { return serie.name == entry.name; });
          self.Radar.removeSerie(result.index);
          $("#InsRadar div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
          break;
          case 12:
          result = _.find(self.Insar.ref.series, function(serie) { return serie.name == entry.name; });
          self.Insar.removeSerie(result.index);
          $("#InsInsar div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
          break;
        }
        
      });

      self.PrismasArray = [];
      
      if(self.PrismasArray.length == 0) {
        for(var i = 0; i<graphic.length;i++) {
          graphic[i].style.display = "none";
        }
        
        $('#dibujo').animate({
          width : '30px',
          height : '30px'
        }, 500);

        estado = 'close';
      }

      let clearChecked = new CustomEvent('clear:checked', {
        detail: {
          state : 'clear'
        }
      });

      window.dispatchEvent(clearChecked);
      
    });

    /* 
      Gatillamos el evento que proviene del componente principal app.component.ts.
      Limpiamos los instrumentos seleccionado y entregamos un nuevo array a PrismasArray
    */
    window.addEventListener('cat', function(event: any) {
      let i: number = 0;
      //console.log(event.detail.idArray);
      (self.PrismasArray).forEach((entry) => {
        
        if(event.detail.idArray == entry.instrumento && event.detail.idArray == 1) {
          self.Prismas.removeSerie(i);
          Scene.resScene().remove( entry.donut );
          self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
        } else if(event.detail.idArray == entry.instrumento && event.detail.idArray == 2) {
          self.Piezometros.removeSerie(i);
          Scene.resScene().remove( entry.donut );
          self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
        } else if(event.detail.idArray == entry.instrumento && event.detail.idArray == 5) {
          self.Inclinometros.removeSerie(i);
          Scene.resScene().remove( entry.donut );
          self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
        } else if(event.detail.idArray == entry.instrumento && event.detail.idArray == 3) {
          self.Extensometros.removeSerie(i);
          Scene.resScene().remove( entry.donut );
          self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
        } else if(event.detail.idArray == entry.instrumento && event.detail.idArray == 6) {
          self.Acelerometros.removeSerie(i);
          Scene.resScene().remove( entry.donut );
          self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
        } else if(event.detail.idArray == entry.instrumento && event.detail.idArray == 11) {
          //console.log(event.detail.idArray);
          self.Radar.removeSerie(i);
          Scene.resScene().remove( entry.donut );
          self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
        } else if(event.detail.idArray == entry.instrumento && event.detail.idArray == 12) {
          self.Insar.removeSerie(i);
          Scene.resScene().remove( entry.donut );
          self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
        }

        i++;
      });

      // Limpiamos el grafico para dejar el texto "Sin Selección"
      switch(event.detail.idArray) {
        case 1:
        $("#InsPrismas div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
        break;
        case 2:
        $("#InsPiezometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
        break;
        case 3:
        $("#InsExtensometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
        break;
        case 5:
        $("#InsInclinometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
        break;
        case 6:
        $("#InsAcelerometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
        break;
        case '11':
        //console.log(event.detail.idArray);
        $("#InsRadar div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
        break;
        case '12':
        $("#InsInsar div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
        break;
      }
    });

    window.addEventListener('periodo', function(event: any) {
      console.log(self.PrismasArray);
      if(self.PrismasArray.length > 0) {

        $('.periodos').modal();
        $('.periodos').modal('open');

        $('#aceptarSelect').click(() => {
          //console.log('se van a borrar los datos');
          let p: number = 0, 
              pi: number = 0, 
              il: number = 0, 
              ac: number = 0,
              ex: number = 0,
              ra: number = 0,
              ins: number = 0;
          (self.PrismasArray).forEach((entry) => {
            switch(entry.instrumento) {
              case 1:
              self.Prismas.removeSerie(p);
              Scene.resScene().remove( entry.donut );
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
              p++;
              break;
              case 2:
              self.Piezometros.removeSerie(pi);
              Scene.resScene().remove( entry.donut );
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
              pi++;
              break;
              case 3:
              self.Extensometros.removeSerie(il);
              Scene.resScene().remove( entry.donut );
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
              il++;
              break;
              case 5:
              self.Inclinometros.removeSerie(ex);
              Scene.resScene().remove( entry.donut );
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
              ex++;
              break;
              case 6:
              self.Acelerometros.removeSerie(ac);
              Scene.resScene().remove( entry.donut );
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
              ac++;
              break;
              case 11:
              self.Radar.removeSerie(ra);
              Scene.resScene().Remove( entry.donut );
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; });
              ra++;
              break;
              case 12:
              self.Insar.removeSerie(ins);
              Scene.resScene().remove( entry.donut )
              self.PrismasArray = _.reject(self.PrismasArray, function(el) { return el.name === entry.name; })
              ins++;
              break;

            }
            
            
          });

          $("#InsPrismas div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
          $("#InsPiezometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
          $("#InsExtensometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
          $("#InsInclinometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
          $("#InsAcelerometros div").html('<span style="position: absolute; top: 48%; left: 42%; font-size: 20px; font-weight: bold; color: #777777;" class="text-val">Sin Selección</span>');
      
          if(self.PrismasArray.length == 0) {
            for(var i = 0; i<graphic.length;i++) {
              graphic[i].style.display = "none";
            }
            
            $('#dibujo').animate({
              width : '30px',
              height : '30px'
            }, 500);
    
            estado = 'close';
          }

          let evento = new CustomEvent("evento:reload", {
            detail: {
             state: 1
            }
          });
          window.dispatchEvent(evento);

        });

      } else {

        let evento = new CustomEvent("evento:reload", {
          detail: {
           state: 2
          }
        });
        window.dispatchEvent(evento);
      }
      
    });


    $("#reset").click(function(e) {
      e.preventDefault();
      //activo.ref.zoomOut();
      switch($("a.active").attr('href')) {
        case '#InsPiezometros':
        if(self.Piezometros) {
          self.Piezometros.ref.zoomOut();
        }
        break;

        case '#InsInclinometros':
        if(self.Inclinometros) {
          self.Inclinometros.ref.zoomOut();
        }
        break;

        case '#InsAcelerometros':
        if(self.Acelerometros) {
          self.Acelerometros.ref.zoomOut();
        }
        break;

        case '#InsRadar':
        if(self.Radar) {
          self.Radar.ref.zoomOut();
        }
        break;

        case '#InsInsar':
        if(self.Insar) {
          self.Insar.ref.zoomOut();
        }
        break;
      }
      
    });

    
    
  }

  

  

}
