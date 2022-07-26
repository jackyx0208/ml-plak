class Editor{
  STATES = {
    NORMAL: 0,
    MOVING_POINT: 1,
    MODEL_SELECTED: 2,
    PIECE_SELECTED: 3
  };

  locked = false;

  constructor(options) {
    this.modelsTable   = $(options.modelsTable);
    this.piecesTable   = $(options.piecesTable);
    this.editPositionButton = $(options.editPositionButton)
    this.pieceEditor   = {}; // cada uno de los inputs que conforman el editor de piezas
    this.modelEditor   = {}; // cada uno de los inputs que conforman el editor de piezas
    this.viewerOptions = {}; // cada uno de los inputs que conforman las opciones del visor 3D
    this.cameraOptions = {}; // cada uno de los inputs que conforman las opciones del visor 3D
    this.markers = options.markers;
    this.initPieceEditor(options.pieceEditor);
    this.initModelEditor(options.modelEditor);
    this.initViewerOptions(options.viewerOptions);
    this.initCameraOptions(options.cameraOptions);
    this.models = {};
    this.distances = {};
    this.viewer = options.viewer;
    this.selectedModel  = null;
    this.selectedPiece  = null;
    this.loadedTextures = null;
    this.selector = options.selector;
    this.mlPlakmodelEditor = options.mlPlakmodelEditor;
    this.storageService = options.storageService;
    this.mlPlakDistanceController = options.mlPlakDistanceController;

    this.setupEvents();

    this.state = this.STATES.NORMAL;
  }

  setupEvents() {
    this.drag = false;
    let mousedown = (() => this.drag = false).bind(this);
    let mouseup = (() => this.drag = true).bind(this);
    this.viewer.container.getElementsByTagName('canvas')[0].addEventListener('mousedown', mousedown);
    this.viewer.container.getElementsByTagName('canvas')[0].addEventListener('mousemove', mouseup);

    this._EditorOnMouseUp = this._EditorOnMouseUp.bind(this);
    this._EditorOnDoubleClick = this._EditorOnDoubleClick.bind(this);
    this.viewer.container.getElementsByTagName('canvas')[0].addEventListener("mouseup", this._EditorOnMouseUp , false);
    this.viewer.container.getElementsByTagName('canvas')[0].addEventListener("dblclick", this._EditorOnDoubleClick , false);

    $('#distance-color').on('change', null,(event) => {
      this.mlPlakDistanceController.changeColor($('#distance-color').val());
    });
  }

  _EditorOnMouseUp(event) {
    if(this.drag) return;
    event.preventDefault();

    if (this.state === this.STATES.MOVING_POINT) {
      this.stopAddingDistancePointToPiece();
      this.mlPlakDistanceController._MlPlakDistancesMouseUP(event);
      this.state = this.STATES.PIECE_SELECTED;
    } else {
      this.selector.selectFromClick(event, true);
    }
  }

  _EditorOnDoubleClick(event) {
    if(this.drag) return;
    event.preventDefault();
    this.selector.selectFromClick(event, false);
  }

  initViewerOptions(items){
    for (var item in items) {
      if (items.hasOwnProperty(item)) {
        this.viewerOptions[item] = $(items[item]);
      }
    }
  }

  initCameraOptions(items){
    for (var item in items) {
      if (items.hasOwnProperty(item)) {
        this.cameraOptions[item] = $(items[item]);
      }
    }
  }

  initPieceEditor(items){
    for (var item in items) {
      if (items.hasOwnProperty(item)) {
        this.pieceEditor[item] = $(items[item]);
      }
    } //console.log(this.pieceEditor)
  }

  initModelEditor(items){
    for (var item in items) {
      if (items.hasOwnProperty(item)) {
        this.modelEditor[item] = $(items[item]);
      }
    }
  }

  // agrega un nuevo modelo a la tabla de modelos.
  appendModel(model){
    // TODO: Check model
    if (!this.models[model.tag]){
      this.modelsTable.bootstrapTable('append', model);
    }
    else {
      this.modelsTable.bootstrapTable('removeByUniqueId', model.guid);
      this.viewer.removeModel(model.tag);

      this.modelsTable.bootstrapTable('append', model);

      if (this.selectedModel && this.selectedModel.tag == model.tag){
        this.piecesTable.bootstrapTable('load', []);
        this.cleanPieceEditor();
      }
    }
    this.models[model.tag] = model;
    //this.selectedModel = model;

    this.viewer.addModel(model);
    this.viewer.updateModel(model);
  }

  appendModels(models, updateTextures = false)
  {
    this.locked = true;
    var self = this;

    $.each(this.models, function(id, model){
      // Si el modelo no aparece en los nuevos modelos o necesita ser actualizado, actualizar
      if (updateTextures || !models[model.tag] || models[model.tag].needsUpdate)
        self.removeModel(model);
    });

    $.each(models, function(id, model){
      if(model.needsUpdate || updateTextures) {
        self.appendModel(model);
      }
    });

    self.models = models;
    this.updateModelsVisibility();
    this.locked = false;
  }

  // eliminar un modelo a la tabla de modelos.
  removeModel(model){
    delete this.models[model.tag];
    this.viewer.removeModel(model.tag);
    this.modelsTable.bootstrapTable('removeByUniqueId', model.guid);
  }

  // actualiza las piezas del modelo que se muestra en la tabla de piezas.
  updatePiecesTable(){
    if (this.selectedModel){
        this.piecesTable.bootstrapTable('load', this.selectedModel.pieces);
    }
  }

  // cambia el modelo actualmente seccionado
  selectModel(model){
    this.stopDragModule();
    this.selectedModel = model;
    this.updateModelEditor();
    this.updatePiecesTable();
    this.selector.selectById(this.selectedModel.id);
    this.state = this.STATES.MODEL_SELECTED;
  }

  redoSelection() {
    if(this.viewer.selectedObject) {
      this.selector.selectById(this.viewer.selectedObject.userData.id);
    }
  }

  onModuleSelected(model){
    this.stopDragModule();
    this.stopRotationModule();
    this.selectedModel = model;
    this.updateModelEditor();
    this.updatePiecesTable();
    this.state = this.STATES.MODEL_SELECTED;
  }

  startAddingDistancePointToPiece(type = "A") {
    if(this.state !== this.STATES.PIECE_SELECTED) {
      alert('Por favor seleccione una pieza');
      return;
    }
    this.state = this.STATES.MOVING_POINT;
    this.mlPlakDistanceController.startPointCreation(type);
  }

  stopAddingDistancePointToPiece() {
    this.state = this.STATES.PIECE_SELECTED;
    this.mlPlakDistanceController.deactivateMouseHelperMouseMoveListener();
  }

  onPieceSelected(model){
    this.stopDragModule();
    this.stopRotationModule();
    this.selectedPiece = model;
    this.updatePieceEditor();
    this.state = this.STATES.PIECE_SELECTED;
  }

  setModelEditorPosition (x, y, z) {
    this.modelEditor.x.val(x);
    this.modelEditor.y.val(y);
    this.modelEditor.z.val(z);
  }

  setModelEditorRotation (rx, ry, rz) {
    this.modelEditor.rx.val(rx);
    this.modelEditor.ry.val(ry);
    this.modelEditor.rz.val(rz);
  }

  // cambia la pieza actualmente seleccionada
  selectPiece(piece){
    this.selectedPiece = piece;
    this.updatePieceEditor();
    this.selector.selectById(piece.model + piece.name);
    this.state = this.STATES.PIECE_SELECTED;
  }

  // cambia el modelo actualmente seccionado
  // si model es indefinido o un falsy value,
  // se actualizan los estados de vision de todos.
  updateModel(model, attrs = {}){
    if(model){
      if(this.models[model.guid]) {
        Object.assign(this.models[model.guid], attrs);
        Object.assign(model, attrs);
      }
      this.modelsTable.bootstrapTable('updateByUniqueId', model.guid, model);
    }
  }

  updateModelsVisibility() {
    //MARK: aca empieza el proceso de transformacion del modelo
    // aca se implementara la logica de SOLO.
    // requermientos:
    // 1 - el modulo que tenga solo en true se mostrará SIEMPRE sin importar el valor del ojo
    // 2 - si hay al menos UN modulo con SOLO == true los demas modulos que no tengan SOLO == true deben estar OCULTOS
    // 3 - solo aquellos modulos que tengan SOLO == true seran visibles pero DEBE HABER AL MENOS UNO con solo == true
    // 4 - al asignar false ONLY, hay que revisar cual es el valor de la propiedad visible en el modelo y asignarla como este el ojo

    // manejo propiedad only

    var tempModel =  JSON.parse(JSON.stringify(editor.models));
    var onlyActivated = [];
    var visibleModelsText = [];
    Object.keys(tempModel).forEach((key, idx) => {
      onlyActivated.push(tempModel[key].only);
    });

    if( onlyActivated.includes(true) ){
      Object.keys(tempModel).forEach((key, idx) => {
        var m = tempModel[key];
        m.visible = m.only;
        this.viewer.updateModelVisibility(m);
        this.markers.toggleMarkersVisibilityByModel(m);
        if(m.visible){
          visibleModelsText.push(m.tag);
        }
      });
    } else {
      Object.keys(tempModel).forEach((key, idx) => {
        var m = tempModel[key];
        this.viewer.updateModelVisibility(m);
        this.markers.toggleMarkersVisibilityByModel(m);
        if(m.visible){
          visibleModelsText.push(m.tag);
        }
      });
    }
    // actualizar que vistas estan visibles.
    // Nota: el elemento #visibleModels, se usa para calcular
    // la posicion del texto que  muestra el hud.
    $('#visibleModels').text(visibleModelsText.join(' | '));
    this.viewer.hud.setCurrentCameraText(
      $("#viewName").text() + ' '  + visibleModelsText.join(' | '));

  }

  // quita los datos de la pieza que se muestra en el editor
  cleanPieceEditor(){
    this.pieceEditor.editor[0].reset();
    this.pieceEditor.index.html('');
    this.pieceEditor.model.html('');
    this.pieceEditor.name.html('');
  }

  startDragModule() {
    this.stopRotationModule();
    $('#edit-position-button').text('Guardar');
    this.mlPlakmodelEditor.setupDragControls(this.viewer.selectedObject)
  }

  stopDragModule() {
    if (this.mlPlakmodelEditor.isDragging) {
      this.saveModulePosition();
    }
    $('#edit-position-button').text('Mover');
    this.mlPlakmodelEditor.stopDragControls();
  }

  waitToUnlock(callback) {
    if(this.locked) {
      window.setTimeout(this.waitToUnlock, 100);
    } else {
      callback();
    }
  }

  startRotationModule() {
    this.stopDragModule();
    $('#edit-rotation-button').text('Guardar');
    this.mlPlakmodelEditor.startRotate(this.viewer.selectedObject)
  }

  stopRotationModule() {
    if (this.mlPlakmodelEditor.isDragging) {
      this.saveModuleRotation();
    }
    $('#edit-rotation-button').text('Rotar');
    this.mlPlakmodelEditor.stopDragControls();
  }


  clearSelection() {
    this.stopDragModule();
    this.stopRotationModule();
    this.selector.clearSelection();
    $('#editor-model-content').toggleClass('hidden', true);
    $('#editor-piece-content').toggleClass('hidden', true);
    $('#editor-clear-selection').toggleClass('hidden', true);
    this.modelEditor.model.html('No hay modelo seleccionado');
  }

  saveModulePosition() {
    const pos = new THREE.Vector3(this.modelEditor.x.val(), this.modelEditor.y.val(), this.modelEditor.z.val());
    this.updateModel(this.selectedModel, {
      x: pos.x,
      y: pos.y,
      z: pos.z
    });
    this.storageService.setModelPosition(this.selectedModel.moduleId, pos);
  }

  saveModuleRotation() {
    const rot = new THREE.Vector3(parseInt(this.modelEditor.rx.val()), parseInt(this.modelEditor.ry.val()), parseInt(this.modelEditor.rz.val()));
    this.updateModel(this.selectedModel, {
      rx: parseInt(rot.x),
      ry: parseInt(rot.y),
      rz: parseInt(rot.z)
    });
    this.storageService.setModelRotation(this.selectedModel.moduleId, rot);
  }

  getSelectedModel() {
    return this.models[this.selectedModel.guid];
  }

  updateModelEditor(){

    $('#editor-model-content').toggleClass('hidden', false);
    $('#editor-piece-content').toggleClass('hidden', true);
    $('#editor-clear-selection').toggleClass('hidden', false);
    this.modelEditor.editor.find('input, select').off('change');
    $('.nav-tabs a[href="#tab-model-editor"]').tab('show');

    var m = this.getSelectedModel();
    this.modelEditor.index.html(m.index);
    this.modelEditor.model.html(m.tag);
    this.modelEditor.rx.val(m.rx);
    this.modelEditor.ry.val(m.ry);
    this.modelEditor.rz.val(m.rz);
    this.setModelEditorPosition(m._x, m._y, m._z);
    this.modelEditor.height.val(m.height);
    this.modelEditor.width.val(m.width);
    this.modelEditor.depth.val(m.depth);
    this.modelEditor.depthMaterial.val(m.depthMaterial);
    this.modelEditor.defaultMaterial.val(m.defaultMaterial);
    this.modelEditor.defaultTapacantos.val(m.defaultTapacantos);
    this.modelEditor.comment.val(m.comment);
    this.modelEditor.comment.tooltip();
    this.modelEditor.description.val(m.description);
    this.modelEditor.description.tooltip();
    this.modelEditor.visible.bootstrapToggle(m.visible?'on':'off');
    this.modelEditor.editor.find('input, select').on('change', $.proxy(this.updateModelByEditor, this));
  }

  updatePieceEditor(){
    $('#editor-piece-content').toggleClass('hidden', false);
    $('#editor-model-content').toggleClass('hidden', true);
    $('#editor-clear-selection').toggleClass('hidden', false);

    if(this.state !== this.STATES.MOVING_POINT) {
      $('.nav-tabs a[href="#tab-model-editor"]').tab('show');
    }

    this.pieceEditor.editor.find('input, select').off('change');
    var p = this.selectedPiece;
    this.pieceEditor.name.html("Pieza: " + p.name);
    this.pieceEditor.width.val(p.w);
    this.pieceEditor.model.val(p.model);
    this.pieceEditor.height.val(p.h);
    this.pieceEditor.length.val(p.l);
    this.pieceEditor.x.val(p.x);
    this.pieceEditor.y.val(p.y);
    this.pieceEditor.z.val(p.z);
    this.pieceEditor.visible.bootstrapToggle(p.visible?'on':'off');
    // this.pieceEditor.wireframe.bootstrapToggle(p.wireframe?'on':'off');
    // this.pieceEditor.color.val(p.color.replace('0x', '#'));
    // this.pieceEditor.orientation.find('option[value="'+p.orientation+'"]').prop('selected', 'selected');
    // this.pieceEditor.texture.find('option[data-index="'+(p.texture ? p.texture.index : '-1')+'"]').prop('selected', 'selected');
    this.pieceEditor.editor.find('input, select').on('change', $.proxy(this.updatePieceByEditor, this));
  }

  // actualiza la información de una pieza en la tabla y el visor.
  updatePiece(piece, attrs){
    Object.assign(piece, attrs);
    this.models[this.selectedModel.guid].pieces[piece.index] = piece;
    this.piecesTable.bootstrapTable('updateByUniqueId', piece.index, piece);
  }

  updatePieceVisibility(piece) {
    this.viewer.updatePiece(piece);
  }

  // actualiza la información de una pieza en la tabla y el visor segun los datos del editor de piezas.
  updatePieceByEditor(){
    var p = this.selectedPiece;
    this.updatePiece(p, {
      visible: this.pieceEditor.visible.is(':checked')
    });
    this.updatePieceVisibility(p);
    this.piecesTable.bootstrapTable('updateByUniqueId', p.index, p);
  }

  //MARK: este método inicia los cambios que se entraron en la interfaz.
  //      rotación y tamaño del módulo seleccionado en un momento determinado.
  updateModelByEditor(){

    this.saveModulePosition();
    this.saveModuleRotation();

    this.updateModel(this.selectedModel, {
      rx: parseInt(this.modelEditor.rx.val()),
      ry: parseInt(this.modelEditor.ry.val()),
      rz: parseInt(this.modelEditor.rz.val()),
      // Compute form global coordinates
      x: parseInt(this.modelEditor.x.val()) - this.selectedModel._x,
      y: parseInt(this.modelEditor.y.val()) - this.selectedModel._y,
      z: parseInt(this.modelEditor.z.val()) - this.selectedModel._z,
      visible: this.modelEditor.visible.is(':checked')
    });

    // probar esto.
    this.markers.transformMarkersByModule(this.selectedModel.tag);
    this.viewer.updateModel(this.selectedModel); //original
    this.markers.returnMarkersByModule(this.selectedModel.tag);

    this.updateModelsVisibility();
  }

  updateViewer(){
    let showLabels     = this.viewerOptions.labels.is(':checked');
    let showGrid       = this.viewerOptions.grid.is(':checked');
    let rotate         = this.viewerOptions.rotation.is(':checked');
    let showDimensions = this.viewerOptions.dimensions.is(':checked');
    //console.log('analizando', rotate)
    this.viewer.showLabels(showLabels);
    this.viewer.toggleGrid(showGrid);
    this.viewer.toggleRotation(rotate);
    this.viewer.showDimensions(showDimensions, this.selectedModel);
  }

  updateCamera(){
    // se usa el primer modelo de la lista para pasarlo
    // TODO: la seleccion de camara NO TIENE nada que ver con un modelo
    //       especifico, debe ser agnostica de modelo. En su lugar
    //       debe trabajar con el primer modelo de la lista o con el grupo
    //       que contiene los modulos (esto es en 3dviever.js)
    var model;
    Object.keys(this.models).forEach((key, idx) => {
      if(0===idx){
        model = this.models[key];
      }
    });

    this.viewer.storeEditorModelsList(this.models);

    if (this.cameraOptions.view.filter(':checked').length == 0 || !model){
      console.log("no hay seleccion de camara o de modelo");
      return;
    }

    this.viewer.clearOrthographicCamera();
    var selectedCameraView = this.cameraOptions.view.filter(':checked')[0];
    var seleccion = this.cameraOptions.view.index(selectedCameraView);

    //var seleccion = this.cameraOptions.view.filter(':checked')[0];
    //console.log("camara seleccionada", seleccion, " modelo: ", model);
    
    switch(seleccion){
      case 0: // 0 frontal
        this.viewer.cameraOrthographic('front');
        break;
      case 1: // 1 atras
        this.viewer.cameraOrthographic('back');
        break;
      case 2: // 2 izquierda
        this.viewer.cameraOrthographic('left');
        break;
      case 3: // 3 derecha
        this.viewer.cameraOrthographic('right');
        break;
      case 4: // 4 top
        this.viewer.cameraOrthographic('top');
        break;
      case 5: // 5 bottom
        this.viewer.cameraOrthographic('bottom');
        break;
      default: //libre
        this.viewer.cameraUserView();
        console.log('Editor.js: No es una opción de cámara válida');
    }
    this.updateModelsVisibility();
  }

  //----------------------------------------------------------------------------------
  // devuelve una lista de  las ultimas transformaciones realizadas a los módulos
  // y a la habitación, el propósito de esta data es ser enviada a la base de datos
  // y restaurarse posteriormente.
  //
  exportEditorData(){
      var editorModifiers = {};
      editorModifiers.name = "editorModifiers";

      if ( viewer.room ){
        // Room
        editorModifiers.room = {};
        // Room.mesh
        editorModifiers.room.mesh = {};
        editorModifiers.room.mesh.scale = viewer.room.mesh.scale;
        editorModifiers.room.mesh.position =  viewer.room.mesh.position;
        // Room.materials
        editorModifiers.room.materials = {};
        editorModifiers.room.materials.ceil = {};
        editorModifiers.room.materials.ceil.color = viewer.room.materials.ceil.color;
        editorModifiers.room.materials.floor = {};
        editorModifiers.room.materials.floor.color = viewer.room.materials.floor.color;
        editorModifiers.room.materials.wall = {};
        editorModifiers.room.materials.wall.color = viewer.room.materials.wall.color;
        // Room.light
        editorModifiers.room.light ={};
        editorModifiers.room.light = viewer.room.light.color;
        editorModifiers.room.light.intensity = viewer.room.light.intensity;

      }



      // Models
      editorModifiers.models=[];

      Object.keys(editor.models).forEach((key, idx) => {
        //console.log('key: ',key, ' idx: ',idx, ' value: ' ,editor.models[key]);

        var editorModel = editor.models[key];
        var modelCopy = {};
        modelCopy.tag = editorModel.tag;
        modelCopy.rx = editorModel.rx;
        modelCopy.ry = editorModel.ry;
        modelCopy.rz = editorModel.rz;
        modelCopy.x = editorModel.x;
        modelCopy.y = editorModel.y;
        modelCopy.z = editorModel.z;
        editorModifiers.models.push(modelCopy);
      });

      return editorModifiers;
  }

  // restaura la información del editor que se ha cargado desde la base de datos
  restoreEditorData(data){
    console.log('data editor restaurar ---> ', data);
    //actualizar data de los modelos
    Object.keys(editor.models).forEach((key, idx) => {

      for( var i = 0; i < data.models.length; i++ ){
        var dm = data.models[i];
        if(key === data.models[i].tag){
          editor.models[key].rx = dm.rx;
          editor.models[key].ry = dm.ry;
          editor.models[key].rz = dm.rz;
          editor.models[key].x = dm.x;
          editor.models[key].y = dm.y;
          editor.models[key].z = dm.z;
          this.viewer.updateModel(editor.models[key]);
        }
      }
    });

    if ( !data.room ){
      console.log('No hay data de room no se restaura nada de eso');
      return;
    }

    //if (!viewer.room){
      // desactivar la habitación mientras se carga.
      // ver: viewer.js->viewer.createRoom();
      $("#btn-create-room").prop('checked', false);
      $('#btn-create-room').click();

      var w = data.room.mesh.scale.x;
      var h = data.room.mesh.scale.y;
      var l = data.room.mesh.scale.z;

      var options = {
                     wallColor: data.room.materials.wall.color,
                     ceilColor: data.room.materials.ceil.color,
                     floorColor: data.room.materials.floor.color};

      this.viewer.destroyRoom();
      this.viewer.createRoom(w,h,l, options,false);
    //}
  }

  updateDistanceModel(model) {
    $("#distance-value").val('');
    if(model.current.pointA) {
      $("#add-point-1").text("Editar A");
      $('#point-a-props').toggleClass('hidden', false);
      $("#point-a-position").val(this.getDistanceText(model.current.pointA.position));
      $("#point-a-piece").val(model.current.pointA.pieceId);
    } else {
      $('#point-a-props').toggleClass('hidden', true);
      $("#add-point-1").text("Definir A");
    }

    if(model.current.pointB) {
      if(model.current.pointA) {
        $("#distance-value").val(Math.round(model.current.distance));
      }
      $("#add-point-2").text("Editar B");
      $('#point-b-props').toggleClass('hidden', false);
      $("#point-b-position").val(this.getDistanceText(model.current.pointB.position));
      $("#point-b-piece").val(model.current.pointB.pieceId);
    } else {
      $('#point-b-props').toggleClass('hidden', true);
      $("#add-point-2").text("Definir B");
    }

    $('#distance-color').val(model.current.color);
    this.updateFixedEditor(model.current);

    if (model.distances) {
      const distancesTable = model.distances.map((distance) => {
        let piece = '';
        if(distance.pointA) piece = distance.pointA.pieceId;
        return {
          id: distance.id,
          color: distance.color,
          piece, // + " - " + distance.pointB.pieceId,
          distance: distance.distance
        }
      });
      $('#table-distances').bootstrapTable('load', distancesTable);
    }
  }

  getDistanceText(position) {
    return Math.round(position.x * 10) + "," + Math.round(position.y * 10) + "," + Math.round(position.z * 10);
  }

  addDistance() {
    this.mlPlakDistanceController.addDistanceToViewer();
  }

  removeDistance(id) {
    this.mlPlakDistanceController.removeDistance(id);
  }

  updateFixedX() {
    let x = $("#distance-fixed-x").prop('checked');
    if (x) {
      this.mlPlakDistanceController.updateFixed(x, false, false);
      this.updateFixedEditor(this.mlPlakDistanceController.currentDistance);
    } else if(this.mlPlakDistanceController.currentDistance.fixedX) {
      this.mlPlakDistanceController.updateFixed(false, false, false);
    }
  }

  updateFixedY() {
    let y = $("#distance-fixed-y").prop('checked');
    if (y) {
      this.mlPlakDistanceController.updateFixed(false, y, false);
      this.updateFixedEditor(this.mlPlakDistanceController.currentDistance);
    } else if(this.mlPlakDistanceController.currentDistance.fixedY) {
      this.mlPlakDistanceController.updateFixed(false, false, false);
    }
  }

  updateFixedZ() {
    let z = $("#distance-fixed-z").prop('checked');
    if (z) {
      this.mlPlakDistanceController.updateFixed(false, false, z);
      this.updateFixedEditor(this.mlPlakDistanceController.currentDistance);
    } else if(this.mlPlakDistanceController.currentDistance.fixedZ) {
      this.mlPlakDistanceController.updateFixed(false, false, false);
    }
  }

  updateFixedEditor(distance) {
    if(!distance.fixedX) {
      $("#distance-fixed-x").prop('checked', distance.fixedX).change();
    }
    if(!distance.fixedY) {
      $("#distance-fixed-y").prop('checked', distance.fixedY).change();
    }
    if(!distance.fixedZ) {
      $("#distance-fixed-z").prop('checked', distance.fixedZ).change();
    }
  }
}
