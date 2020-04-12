function mostrarAyuda(caso){
  var ayudaPane = document.getElementById('ayuda');
  var glosarioPane = document.getElementById('glosario');
  var botonAyuda = document.getElementById('buttonAyuda');
  var botonGlosario = document.getElementById('buttonGlosario');
  var header = document.getElementById('headerAyuda');
  switch(caso){
    case 'ayuda':
      glosarioPane.style="display: none";
      ayudaPane.style="display:block";
      botonAyuda.className="btn btn-warning text-white";
      botonGlosario.className="btn btn-default";
      header.innerHTML="<b>Ayuda de Uchuva</b>";
      header.className="text-warning";
    break;
    case 'glosario':
      glosarioPane.style="display: block";
      ayudaPane.style="display:none";
      botonAyuda.className="btn btn-default";
      botonGlosario.className="btn btn-primary text-white";
      header.innerHTML="<b>Glosario de Uchuva</b>";
      header.className="text-primary";
    break;
  }
}
