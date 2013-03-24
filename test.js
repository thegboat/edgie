(function($) {

$.widget("ui.test", {
  options: {
    scale: 1.0,
    members: '',
    'fill' : "#F8F8F8,#AEAEAE",
    highlighted  : "#4C7ABF",
    member    : "#B7DFE5,#4CAEBF",
    edge : "#000",
    selected : null,
    font : "News Cycle",
    'translation-table' : null,
    clickable :  'members',
    multiselect : false, // single, multiple
    formselector : null, 
    infoselector : null,
    preselect : true
  },

  paint : function(shapes, color){
    this.painted = this.painted || {}
    var shape_ids = this._parse_shape_collection(shapes)
    for(var i in shape_ids){
      var shape_id = shape_ids[i]
      var entity = this.entities[shape_id]
      if(!entity) continue;
      this.painted[shape_id] = true
      this._change_color(entity, color)
    }
  },

  unpaint : function(shapes){
    if(!this.painted) return false;
    if(shapes){
      var shape_ids = this._parse_shape_collection(shapes)
      for(var i in shape_ids){
        this._unpaint_one(shape_ids[i]);
      }
    }else{
      for(var shape_id in this.painted){
        this._unpaint_one(shape_id);
      }
    }
  },

  label : function(text){
    text = String(text || '')
    this.header_text.attr({text : text})
  },

  add_to : function(group_name, options){
    options = options || {}
    group_name = group_name.trim()
    this.groups[group_name] = this.groups[group_name] || {}
    this._set_color(group_name, options.colors)
    this.clickable[group_name] = !!options.clickable
    this._manage_group(group_name, options.shapes, true)
    if(options.clickable){
      this.clickable[group_name] = true 
    }else if(options.clickable == false){
      delete this.clickable[group_name]
    }
    return this[group_name]
  },

  remove_from : function(group_name, shapes){
    if(!this.groups[group_name]) return null;
    if(shapes){
      this._manage_group(group_name, shapes)
    }
    else{
      for(shape in this.groups[group_name]) { this._manage_group(group_name, shape)}
    }
    return this[group_name]
  },

  _translation_table : function(){
    return {"1":"abbeville","2":"aiken","3":"allendale","4":"anderson","5":"bamberg","6":"barnwell","7":"beaufort","8":"berkeley","9":"calhoun","10":"charleston","11":"cherokee","12":"chester","13":"chesterfield","14":"clarendon","15":"colleton","16":"darlington","17":"dillon","18":"dorchester","19":"edgefield","20":"fairfield","21":"florence","22":"georgetown","23":"greenville","24":"greenwood","25":"hampton","26":"horry","27":"jasper","28":"kershaw","29":"lancaster","30":"laurens","31":"lee","32":"lexington","33":"marion","34":"marlboro","35":"mccormick","36":"newberry","37":"oconee","38":"orangeburg","39":"pickens","40":"richland","41":"saluda","42":"spartanburg","43":"sumter","44":"union","45":"williamsburg","46":"york"}
  },

  _create : function(){
    this.options = $.extend(this.options,this.element.data());
    this._info_div(true);
    this.pen = '';

    this.paper = Raphael(this.element[0], this._scaled(this._width()), this._scaled(this._height()));
    if(this.core) this.core.remove();
    this.core = this.paper.set();
    this.header_text = this.paper.text(this._scaled(this._width()/2), this._scaled(40), '').attr({'font-size' : this._scaled(32)});
    this.core.push(this.header_text);

    this._create_translation_table();

    this._make_groups();
    this._set_colors();
    var to_hlight = this._parse_group('selected');
    this.entities = this._base_entities(true);
    this._draw_shapes();
    this._set_clickable();
    if(to_hlight) this._clicked(this.entities[to_hlight])

    this.core.toFront();
    this.paper.safari();
  },

  _draw_shapes : function(){
    var entity, paths = this._base_paths();
    for(var entity_name in this.entities){
      this._draw_shape(entity_name, paths);
    }
  },

  _draw_shape : function(entity_name, paths){
    paths = paths || this._base_paths();
    var entity = this.entities[entity_name.trim()];
    this.pen = '';
    for(var edge_idx in entity.edges){
      var reverse = /r$/.test(entity.edges[edge_idx]);
      var contained = /z$/.test(entity.edges[edge_idx]);
      var path = paths[parseInt(entity.edges[edge_idx])];

      if(contained) this._write_shape(entity);
      this._stroke_path(path, reverse);

      if(contained) this._write_shape(entity);
    }
    this._write_shape(entity);
    this._add_label(entity);
    this._add_events(entity);
  },

  _write_shape : function(entity, attrs){
    if(!this.pen || this.pen == 'M') return false ;
    this.pen += 'Z';
    color = this._get_color(entity)
    attrs = attrs || {fill: color, stroke: this.colors.edge, "stroke-width": 0.8, "stroke-linejoin": "round"};
    entity.shape.push(this.paper.path(this.pen).attr(attrs));
    this.pen = '';
    return true;
  },

  _stroke_path : function(path,reverse){
    for(var coords in path){
      var idx = reverse ? ((path.length-1) - coords) : coords;
      this.pen += (!this.pen ? 'M' : 'L');
      this.pen += [this._scaled(path[idx][0]),this._scaled(path[idx][1])].join(',');
    }
  },

  _add_label : function(entity){
    var x = this._scaled(entity.text[0]), y = this._scaled(entity.text[1]);
    var r = this.paper.print(x,y, entity.title, this.paper.getFont(this.options.font), this._scaled(16));
    entity.label = r;
    this.core.push(r);
  },

  _add_events : function(entity){
    var map = this;
    var mover = (function(){
      map._check_cursor(entity)
      map.unpaint();
      if(!map._is_in_group('selected',entity)){
        var color = map._get_color(entity, true)
        entity.shape.animate({fill: color, stroke: map.colors.edge}, 200);
        map.header_text.attr({text : entity.title});
        map.paper.safari();
      }
    });
    var mout = (function(){
      map._check_cursor(entity)
      map.unpaint();
      if(!map._is_in_group('selected',entity)){
        entity.shape.animate({fill: map._get_color(entity), stroke: map.colors.edge}, 200);
        text = map.highlighted ? map.highlighted.title : '';
        map.header_text.attr({text : text});
        map.paper.safari();
      }
    });
    entity.shape.hover(mover,mout);
    entity.label.hover(mover,mout);
    entity.shape.click(function(){map._clicked(entity)});
    entity.label.click(function(){map._clicked(entity)});
  },

  _clicked : function(entity){
    if(!this._is_clickable(entity)) return false;
    var other = this.highlighted;
    this.highlighted = entity;
    this.unpaint();

    if(this.options.multiselect){
      if(this.highlighted == other){
        this._remove_from('selected', this.highlighted, true);
      }else{
        this._add_to('selected', this.highlighted);
      }
    }
    else{
      this._add_to('selected', this.highlighted);
      if(other != this.highlighted) this._remove_from('selected', other);
    }
    if(this.highlighted){
      this.header_text.attr({text : this.highlighted.title});
    }
    this._info_div();
    if(this.info_div){
      var info_div = this._get_info_div(entity)
      if(info_div){
        this.info_div.html(info_div.html());
      }
      else{
        this.info_div.empty();
      }
    }
    this.paper.safari();
  },

  _set_clickable : function(){
    this.clickable = {}
    if(/(^|,)\s*all\s*($|,)/i.test(this.options.clickable)){
      for(var group_name in this.groups){
        this.clickable[group_name] = true
      }
    }else{
      var group_names = this.options.clickable.split(',');
      for(var i in group_names){
        this.clickable[group_names[i]] = true
      }
    }
  },

  _is_clickable : function(entity){
    var click_group = entity.click_group
    if(this.clickable[click_group] && this.groups[click_group][entity.name]) return true
    for(var group_name in this.clickable){
      if(this.groups[group_name][entity.name]){
        entity.click_group = group_name
        return true
      }
    }
    if(click_group) delete entity.click_group
    return false
  },

  _check_cursor : function(entity){
    var clickable = this._is_clickable(entity)
    var label = $(entity.label.node)
    if(clickable && label.css('cursor')){
      entity.shape.forEach(function(obj){ $(obj.node).css('cursor', 'pointer') });
      label.css('cursor', 'pointer');
    }else if(!clickable && label.css('cursor')){
      entity.shape.forEach(function(obj){ $(obj.node).css('cursor', false) });
      label.css('cursor', false);
    }
  },

  _set_colors : function(){
    var hlight = this.options.highlighted.split(',')
    this.colors = {
      fill          : this.options.fill.split(','),
      highlighted   : [hlight[0], hlight[0]],
      members       : this.options.member.split(','),
      edge          : this.options.edge,
    }
    for(var group_name in this.groups){
      this._set_color(group_name)
    }
  },

  _set_color : function(group_name, colors){
    if(colors){
      this.colors[group_name] = colors.split(',')
    }
    else if(this.options["color-"+group_name]){
      this.colors[group_name] = this.options["color-"+group_name].split(',')
    }
    else{
      this.colors[group_name] = this.colors[group_name] || this.colors.fill
    }
  },

  _make_groups : function(){
    this.groups = {members : {}}
    this._parse_group('members')
    entities = this._base_entities()
    for(var group_name in this.options){
      if(/^group-[A-Za-z0-9]/.test(group_name)){
        this._parse_group(group_name, entities)
      }
    }
  },

  _parse_group : function(key, entities){
    var shape_ids = this._parse_shape_collection(this.options[key])
    var group_name = key.replace(/^group-/,'').trim(), first = null;
    this.groups[group_name] = {}
    if(shape_ids.length){
      entities = entities || this._base_entities();
      for(i in shape_ids){
        var val = null;
        if(entities[shape_ids[i]]) val = shape_ids[i];
        if(val){
          this.groups[group_name][val] = true;
          first = first || val
          if(key == 'selected' && !this.multiselect) break;
        }
      }
    }
    return first;
  },

  _is_in_group : function(group_name, entity){
    return !!(this.groups[group_name] && this.groups[group_name][entity.name])
  },

  _get_group : function(entity){
    if(this._is_in_group('selected', entity)) return 'highlighted'
    if(this._is_in_group('members', entity)) return 'members'
    for(var group_name in this.groups){
      if(this.groups[group_name][entity.name]) return group_name
    }
    return null
  },

  _get_color : function(entity, hovering){
    group_name = this._get_group(entity)
    if(group_name){
      var l = this.colors[group_name].length
      return (hovering ? this.colors[group_name][l-1] : this.colors[group_name][0])
    }
    return (hovering ? this.colors.fill[1] : this.colors.fill[0])
  },

  _info_div : function(init){
    if(!this.options.infoselector) return null
    if(init || !this.preselect){
      var info_div = $(this.options.infoselector);
      this.info_div = info_div.length ? info_div : null;
    }
  },

  _get_info_div : function(entity, init){
    if(!this.options.infoselector) return null;
    if(!entity.info_selector){
      var sel = this.options.infoselector + "_" + entity.name;
      if(entity.id) sel += ", " + this.options.infoselector + "_" + entity.id;
      entity.info_selector = sel;
    }
    if(init || !this.preselect){
      var info_div = $(entity.info_selector);
      if(info_div.length){
        if(this.preselect) entity.info_div = info_div;
        return info_div;
      }
    }else{
      return entity.info_div;
    }
    return null;
  },

  _get_form_input : function(entity, init){
    if(!this.options.formselector) return null;
    if(!entity.form_selector){
      var sel = this.options.formselector.replace(/\|shape_id\|/, entity.name);
      if(entity.id) sel += ", " + this.options.formselector.replace(/\|shape_id\|/, entity.id);
      entity.form_selector = sel;
    }
    if(init || !this.preselect){
      var input = $(entity.form_selector);
      if(input.length){
        if(this.preselect) entity.form_input = input;
        return input;
      }
    }else{
      return entity.form_input;
    }
    return null;
  },

  _add_to : function(group_name, entity){
    if(!entity) return false
    this.groups[group_name][entity.name] = true;
    var color = this._get_color(entity)
    this._change_color(entity, color)
    if(group_name == 'selected'){
      var input = this._get_form_input(entity)
      if(input) input.prop('checked', true);
    }
    return true
  },

  _remove_from : function(group_name, entity, hovering){
    if(!entity) return false
    delete this.groups[group_name][entity.name]
    var color = this._get_color(entity,hovering)
    this._change_color(entity, color)
    if(group_name == 'selected'){
      var input = this._get_form_input(entity)
      if(input) input.prop('checked', false);
    }
    return true
  },

  _manage_group : function(group_name, shapes, adding){
    if(!this.groups[group_name]) return false
    var shape_ids = this._parse_shape_collection(shapes)
    for(var i in shape_ids){
      var entity = this.entities[shape_ids[i]]
      adding ? this._add_to(group_name, entity) : this._remove_from(group_name, entity);
    }
    return true
  },

  _parse_shape_collection : function(shapes){
    shapes = String(shapes || '')
    if(!shapes.trim()) return []
    var map = this
    return shapes.split(',').map(function(x){
      var shape = x.trim()
      shape = map.translation_table[shape] || shape
      return shape;
    })
  },

  _change_color : function(entity, color){
    if(entity.shape.attr('fill') != color){
      entity.shape.attr({fill: color, stroke: this.colors.edge});
    }
  },

  _scaled : function(val){
    return val * this.options.scale;
  },

  _unpaint_one : function(shape_id){
    shape_id = shape_id.trim()
    if(!this.painted[shape_id]) return false;
    delete this.painted[shape_id];
    var entity = this.entities[shape_id];
    if(!entity) return false;
    this._change_color(entity, this._get_color(entity));
    return true;
  },

  _create_translation_table : function(){
    this.translation_table = this.options['translation-table']
    this.translation_table = this.translation_table || (this._translation_table ? this._translation_table() : {});
  },

  _base_entities : function(to_be_stored){
    var entities = {
        pickens           : { name : 'pickens'        , title : 'Pickens'        , text : [168,182]      , edges : ["1z"]},
        dillon            : { name : 'dillon'         , title : 'Dillon'         , text : [737,262]      , edges : ["2z"]},
        marlboro          : { name : 'marlboro'       , title : 'Marlboro'       , text : [673,252]      , edges : ["3z"]},
        darlington        : { name : 'darlington'     , title : 'Darlington'     , text : [640,295]      , edges : ["4z"]},
        chesterfield      : { name : 'chesterfield'   , title : 'Chesterfield'   , text : [619,238]      , edges : ["5z"]},
        lancaster         : { name : 'lancaster'      , title : 'Lancaster'      , text : [513,221]      , edges : ["6z"]},
        kershaw           : { name : 'kershaw'        , title : 'Kershaw'        , text : [536,300]      , edges : ["7z"]},
        fairfield         : { name : 'fairfield'      , title : 'Fairfield'      , text : [453,276]      , edges : ["8z"]},
        chester           : { name : 'chester'        , title : 'Chester'        , text : [438,206]      , edges : ["9z"]},
        marion            : { name : 'marion'         , title : 'Marion'         , text : [735,373]      , edges : ["10z"]},
        florence          : { name : 'florence'       , title : 'Florence'       , text : [699,358]      , edges : ["11z"]},
        lee               : { name : 'lee'            , title : 'Lee'            , text : [583,323]      , edges : ["12z"]},
        sumter            : { name : 'sumter'         , title : 'Sumter'         , text : [600,384]      , edges : ["13z"]},
        richland          : { name : 'richland'       , title : 'Richland'       , text : [489,366]      , edges : ["14z"]},
        newberry          : { name : 'newberry'       , title : 'Newberry'       , text : [361,299]      , edges : ["15z"]},
        union             : { name : 'union'          , title : 'Union'          , text : [346,223]      , edges : ["16z"]},
        calhoun           : { name : 'calhoun'        , title : 'Calhoun'        , text : [499,420]      , edges : ["17z"]},
        clarendon         : { name : 'clarendon'      , title : 'Clarendon'      , text : [604,428]      , edges : ["18z"]},
        williamsburg      : { name : 'williamsburg'   , title : 'Williamsburg'   , text : [698,452]      , edges : ["19z"]},
        dorchester        : { name : 'dorchester'     , title : 'Dorchester'     , text : [571,552]      , edges : ["20z"]},
        orangeburg        : { name : 'orangeburg'     , title : 'Orangeburg'     , text : [547,480]      , edges : ["21z"]},
        bamberg           : { name : 'bamberg'        , title : 'Bamberg'        , text : [448,509]      , edges : ["22z"]},
        lexington         : { name : 'lexington'      , title : 'Lexington'      , text : [427,383]      , edges : ["23z"]},
        saluda            : { name : 'saluda'         , title : 'Saluda'         , text : [336,351]      , edges : ["24z"]},
        greenwood         : { name : 'greenwood'      , title : 'Greenwood'      , text : [269,322]      , edges : ["25z"]},
        laurens           : { name : 'laurens'        , title : 'Laurens'        , text : [308,271]      , edges : ["26z"]},
        horry             : { name : 'horry'          , title : 'Horry'          , text : [828,397]      , edges : ["27z"]},
        georgetown        : { name : 'georgetown'     , title : 'Georgetown'     , text : [755,491]      , edges : ["28z"]},
        berkeley          : { name : 'berkeley'       , title : 'Berkeley'       , text : [678,551]      , edges : ["29z"]},
        charleston        : { name : 'charleston'     , title : 'Charleston'     , text : [709,618]      , edges : ["30z"]},
        colleton          : { name : 'colleton'       , title : 'Colleton'       , text : [526,623]      , edges : ["31z"]},
        beaufort          : { name : 'beaufort'       , title : 'Beaufort'       , text : [514,701]      , edges : ["32z","33z","34z","35z","36z","37z","38z"]},
        jasper            : { name : 'jasper'         , title : 'Jasper'         , text : [447,711]      , edges : ["39z"]},
        hampton           : { name : 'hampton'        , title : 'Hampton'        , text : [445,604]      , edges : ["40z"]},
        allendale         : { name : 'allendale'      , title : 'Allendale'      , text : [401,567]      , edges : ["41z"]},
        barnwell          : { name : 'barnwell'       , title : 'Barnwell'       , text : [380,496]      , edges : ["42z"]},
        aiken             : { name : 'aiken'          , title : 'Aiken'          , text : [383,475]      , edges : ["43z"]},
        edgefield         : { name : 'edgefield'      , title : 'Edgefield'      , text : [304,407]      , edges : ["44z"]},
        mccormick         : { name : 'mccormick'      , title : 'McCormick'      , text : [240,396]      , edges : ["45z"]},
        abbeville         : { name : 'abbeville'      , title : 'Abbeville'      , text : [209,307]      , edges : ["46z"]},
        anderson          : { name : 'anderson'       , title : 'Anderson'       , text : [195,268]      , edges : ["47z"]},
        york              : { name : 'york'           , title : 'York'           , text : [438,148]      , edges : ["48z"]},
        cherokee          : { name : 'cherokee'       , title : 'Cherokee'       , text : [353,141]      , edges : ["49z"]},
        spartanburg       : { name : 'spartanburg'    , title : 'Spartanburg'    , text : [295,195]      , edges : ["50z"]},
        greenville        : { name : 'greenville'     , title : 'Greenville'     , text : [225,213]      , edges : ["51z"]},
        oconee            : { name : 'oconee'         , title : 'Oconee'         , text : [113,215]      , edges : ["52z"]},
    };
    if(to_be_stored){
      for(var id in this.translation_table){
        var entity_name = this.translation_table[id];
        if(entity_name) entities[entity_name].id = id;
      }
      for(var entity_name in entities){
        var entity = entities[entity_name];
        var id = entity.id ? entity.id : entity.name;
        this._get_form_input(entity, true)
        this._get_info_div(entity, true)
        entity.shape = this.paper.set();
      }
    }
    return entities;
  },

  _width : function(){
    return 804
  },

  _height : function(){
    return 642
  },

  _base_paths : function(){
    return {
        1         : [[120,93]       , [119,97]       , [129,100]      , [135,98]       , [150,97]       , [152,103]      , [150,109]      , [159,108]      , [158,116]      , [162,119]      , [161,121]      , [163,125]      , [168,139]      , [167,131]      , [168,147]      , [147,159]      , [116,177]      , [111,182]      , [111,178]      , [110,178]      , [107,176]      , [108,170]      , [106,170]      , [107,164]      , [106,163]      , [100,162]      , [104,151]      , [100,148]      , [99,137]       , [99,132]       , [100,127]      , [101,125]      , [98,121]       , [98,114]       , [94,113]       , [95,110]       , [99,109]       , [98,102]       , [104,97]       , [112,95]       , [120,93]       ],
        2         : [[696,209]      , [715,227]      , [723,236]      , [728,240]      , [737,249]      , [731,259]      , [726,257]      , [724,254]      , [721,255]      , [718,256]      , [715,260]      , [710,259]      , [704,257]      , [701,256]      , [700,257]      , [696,255]      , [691,253]      , [689,250]      , [683,251]      , [681,252]      , [673,254]      , [671,255]      , [668,256]      , [664,262]      , [660,261]      , [656,261]      , [655,256]      , [646,252]      , [665,210]      , [674,189]      , [682,193]      , [690,202]      , [696,209]      ],
        3         : [[631,151]      , [641,151]      , [648,163]      , [655,169]      , [661,174]      , [663,176]      , [669,182]      , [670,184]      , [673,186]      , [673,188]      , [673,191]      , [667,204]      , [665,207]      , [650,240]      , [645,252]      , [642,250]      , [638,246]      , [638,242]      , [638,240]      , [638,239]      , [639,237]      , [636,236]      , [637,232]      , [631,231]      , [625,219]      , [629,220]      , [630,212]      , [626,211]      , [624,208]      , [622,208]      , [620,212]      , [619,212]      , [615,214]      , [609,205]      , [614,200]      , [616,191]      , [621,190]      , [618,182]      , [614,181]      , [609,179]      , [606,175]      , [601,164]      , [597,158]      , [595,160]      , [594,151]      , [631,151]      ],
        4         : [[589,215]      , [603,214]      , [611,207]      , [611,212]      , [612,212]      , [615,216]      , [619,216]      , [623,213]      , [622,211]      , [623,210]      , [628,213]      , [627,216]      , [627,217]      , [624,218]      , [629,234]      , [635,232]      , [637,239]      , [634,240]      , [639,248]      , [640,247]      , [637,255]      , [628,253]      , [625,263]      , [614,261]      , [614,264]      , [605,271]      , [589,283]      , [583,288]      , [578,293]      , [570,295]      , [560,283]      , [565,271]      , [562,255]      , [555,253]      , [555,245]      , [554,239]      , [548,242]      , [547,250]      , [539,244]      , [538,242]      , [537,241]      , [536,240]      , [556,227]      , [573,217]      , [587,213]      , [589,215]      ],
        5         : [[549,150]      , [565,151]      , [593,151]      , [594,162]      , [597,159]      , [601,166]      , [603,170]      , [604,174]      , [606,177]      , [609,180]      , [612,181]      , [615,183]      , [617,184]      , [618,188]      , [619,190]      , [611,193]      , [616,198]      , [610,205]      , [608,207]      , [604,212]      , [602,213]      , [589,215]      , [586,213]      , [573,216]      , [536,238]      , [534,232]      , [531,230]      , [530,225]      , [529,214]      , [528,210]      , [525,209]      , [522,204]      , [519,198]      , [520,192]      , [511,185]      , [512,180]      , [503,176]      , [502,168]      , [497,160]      , [494,156]      , [492,156]      , [490,150]      , [549,150]      ],
        6         : [[443,113]      , [451,125]      , [452,128]      , [450,145]      , [449,149]      , [462,149]      , [480,150]      , [487,151]      , [491,155]      , [503,173]      , [513,190]      , [497,198]      , [492,202]      , [495,211]      , [486,215]      , [483,212]      , [483,214]      , [478,213]      , [478,214]      , [473,217]      , [471,214]      , [466,208]      , [466,213]      , [460,217]      , [459,216]      , [460,205]      , [454,208]      , [449,212]      , [444,216]      , [442,217]      , [439,221]      , [436,220]      , [434,219]      , [435,216]      , [435,214]      , [439,202]      , [437,201]      , [435,191]      , [433,180]      , [438,180]      , [439,174]      , [439,171]      , [438,169]      , [437,166]      , [437,157]      , [435,150]      , [434,147]      , [437,146]      , [438,143]      , [437,136]      , [437,132]      , [439,131]      , [438,126]      , [438,119]      , [436,118]      , [434,112]      , [433,109]      , [433,105]      , [433,102]      , [438,105]      , [440,108]      , [443,113]      ],
        7         : [[507,194]      , [510,193]      , [512,191]      , [516,193]      , [520,195]      , [519,200]      , [522,205]      , [524,208]      , [526,211]      , [527,214]      , [529,226]      , [530,230]      , [534,234]      , [534,236]      , [536,243]      , [526,245]      , [522,245]      , [524,252]      , [520,252]      , [512,253]      , [511,258]      , [511,264]      , [511,273]      , [503,279]      , [497,285]      , [494,287]      , [490,291]      , [487,292]      , [484,293]      , [483,293]      , [481,293]      , [478,293]      , [468,300]      , [462,298]      , [459,297]      , [456,293]      , [454,291]      , [449,287]      , [444,282]      , [439,278]      , [440,273]      , [447,255]      , [450,250]      , [452,246]      , [455,241]      , [453,236]      , [451,229]      , [447,231]      , [444,229]      , [441,227]      , [439,224]      , [438,221]      , [458,207]      , [458,209]      , [458,217]      , [461,217]      , [463,217]      , [464,215]      , [465,214]      , [466,211]      , [468,211]      , [470,215]      , [471,217]      , [476,216]      , [480,217]      , [482,215]      , [485,214]      , [486,217]      , [496,213]      , [492,201]      , [507,194]      ],
        8         : [[362,200]      , [391,202]      , [436,205]      , [436,210]      , [436,212]      , [432,215]      , [434,219]      , [438,227]      , [442,229]      , [447,233]      , [452,230]      , [453,238]      , [453,241]      , [449,250]      , [447,254]      , [447,256]      , [446,258]      , [444,259]      , [442,260]      , [430,262]      , [427,262]      , [406,267]      , [402,269]      , [402,271]      , [396,270]      , [392,270]      , [389,270]      , [385,269]      , [387,275]      , [385,275]      , [385,276]      , [383,275]      , [373,271]      , [369,268]      , [367,266]      , [365,266]      , [363,264]      , [359,261]      , [360,258]      , [359,255]      , [356,250]      , [354,243]      , [347,226]      , [346,218]      , [346,207]      , [346,199]      , [362,200]      ],
        9         : [[433,149]      , [436,156]      , [438,173]      , [437,176]      , [434,179]      , [434,184]      , [432,191]      , [435,197]      , [437,203]      , [427,206]      , [415,203]      , [405,202]      , [345,198]      , [346,195]      , [348,191]      , [346,187]      , [345,184]      , [343,182]      , [341,178]      , [340,173]      , [343,168]      , [336,168]      , [337,162]      , [339,163]      , [340,160]      , [342,156]      , [338,152]      , [336,149]      , [433,149]      ],
        10        : [[679,254]      , [682,253]      , [684,252]      , [687,252]      , [691,253]      , [694,255]      , [697,257]      , [705,258]      , [713,261]      , [715,262]      , [721,254]      , [723,255]      , [724,255]      , [725,257]      , [735,265]      , [720,273]      , [717,280]      , [717,282]      , [717,283]      , [717,285]      , [709,293]      , [713,304]      , [701,302]      , [697,314]      , [695,319]      , [697,321]      , [699,325]      , [701,330]      , [701,332]      , [707,333]      , [710,345]      , [709,354]      , [713,361]      , [720,367]      , [718,373]      , [714,371]      , [709,371]      , [709,368]      , [705,368]      , [705,360]      , [702,360]      , [701,355]      , [701,351]      , [700,344]      , [695,345]      , [691,343]      , [685,336]      , [686,333]      , [677,330]      , [670,322]      , [672,320]      , [672,319]      , [666,315]      , [667,314]      , [667,308]      , [663,294]      , [666,292]      , [665,290]      , [666,286]      , [663,287]      , [657,276]      , [660,270]      , [659,263]      , [668,261]      , [670,255]      , [674,255]      , [679,254]      ],
        11        : [[657,262]      , [658,264]      , [659,266]      , [659,268]      , [660,272]      , [656,273]      , [656,276]      , [656,279]      , [662,284]      , [663,289]      , [664,292]      , [662,294]      , [663,297]      , [665,306]      , [667,313]      , [664,314]      , [670,319]      , [669,327]      , [680,332]      , [686,338]      , [690,342]      , [689,345]      , [696,345]      , [699,351]      , [688,348]      , [686,352]      , [685,351]      , [681,353]      , [670,358]      , [668,357]      , [657,354]      , [653,353]      , [648,353]      , [646,349]      , [632,352]      , [632,349]      , [626,347]      , [623,346]      , [621,346]      , [618,344]      , [616,343]      , [614,338]      , [610,336]      , [607,335]      , [597,336]      , [593,336]      , [592,334]      , [590,328]      , [590,326]      , [591,322]      , [599,318]      , [603,317]      , [600,312]      , [597,309]      , [591,309]      , [586,304]      , [580,299]      , [573,296]      , [583,289]      , [603,273]      , [616,264]      , [626,264]      , [629,254]      , [634,255]      , [636,257]      , [639,252]      , [648,253]      , [652,254]      , [657,262]      ],
        12        : [[555,251]      , [557,255]      , [565,263]      , [564,271]      , [563,276]      , [559,278]      , [558,281]      , [557,284]      , [561,287]      , [563,289]      , [565,291]      , [570,296]      , [572,297]      , [575,299]      , [580,299]      , [582,302]      , [583,305]      , [581,309]      , [579,311]      , [576,312]      , [574,312]      , [570,313]      , [554,323]      , [553,312]      , [542,315]      , [540,306]      , [538,308]      , [535,304]      , [533,302]      , [533,299]      , [530,298]      , [524,295]      , [503,300]      , [504,284]      , [505,278]      , [509,275]      , [511,270]      , [513,265]      , [511,260]      , [513,257]      , [514,254]      , [522,253]      , [525,253]      , [523,246]      , [532,246]      , [536,238]      , [542,249]      , [548,246]      , [549,246]      , [552,240]      , [554,245]      , [554,247]      , [555,251]      ],
        13        : [[511,296]      , [523,301]      , [531,293]      , [534,307]      , [542,308]      , [538,313]      , [542,315]      , [545,316]      , [550,315]      , [552,314]      , [553,324]      , [569,315]      , [579,312]      , [584,305]      , [590,309]      , [593,311]      , [600,313]      , [599,316]      , [580,329]      , [565,339]      , [553,345]      , [538,357]      , [517,360]      , [518,371]      , [512,372]      , [513,367]      , [508,367]      , [507,372]      , [503,371]      , [502,375]      , [499,384]      , [494,384]      , [493,384]      , [491,383]      , [490,382]      , [491,379]      , [490,378]      , [486,378]      , [482,374]      , [481,370]      , [480,366]      , [484,362]      , [484,358]      , [484,354]      , [481,349]      , [480,346]      , [479,342]      , [481,341]      , [480,337]      , [480,333]      , [478,331]      , [481,328]      , [480,322]      , [478,315]      , [482,309]      , [483,302]      , [479,299]      , [480,298]      , [481,294]      , [486,294]      , [502,282]      , [505,289]      , [500,291]      , [511,296]      ],
        14        : [[399,271]      , [408,268]      , [420,265]      , [432,262]      , [444,261]      , [437,278]      , [443,281]      , [458,295]      , [462,301]      , [477,296]      , [477,301]      , [489,308]      , [472,311]      , [478,319]      , [477,322]      , [479,322]      , [476,335]      , [479,330]      , [479,339]      , [479,343]      , [477,343]      , [480,347]      , [480,352]      , [483,355]      , [482,360]      , [481,365]      , [477,366]      , [475,360]      , [470,361]      , [468,364]      , [466,360]      , [461,362]      , [462,360]      , [458,360]      , [455,360]      , [453,361]      , [449,359]      , [440,356]      , [442,351]      , [430,352]      , [431,347]      , [426,349]      , [419,343]      , [413,337]      , [414,334]      , [412,332]      , [412,330]      , [413,330]      , [413,328]      , [412,326]      , [408,315]      , [406,314]      , [400,310]      , [398,308]      , [397,305]      , [392,300]      , [386,295]      , [378,292]      , [370,294]      , [364,283]      , [366,279]      , [362,276]      , [359,274]      , [359,273]      , [360,271]      , [361,270]      , [365,263]      , [371,272]      , [374,273]      , [376,273]      , [378,273]      , [387,280]      , [387,271]      , [399,271]      ],
        15        : [[323,218]      , [323,230]      , [331,219]      , [335,217]      , [338,215]      , [342,215]      , [345,215]      , [346,225]      , [354,249]      , [356,252]      , [361,263]      , [361,266]      , [361,267]      , [360,269]      , [359,270]      , [355,279]      , [343,278]      , [343,288]      , [343,291]      , [348,296]      , [350,299]      , [346,298]      , [341,296]      , [337,298]      , [331,299]      , [313,289]      , [301,280]      , [295,277]      , [291,275]      , [286,280]      , [280,278]      , [268,274]      , [269,285]      , [265,282]      , [265,277]      , [258,273]      , [264,264]      , [264,260]      , [268,251]      , [277,245]      , [284,241]      , [294,226]      , [298,222]      , [308,208]      , [315,210]      , [317,214]      , [323,218]      ],
        16        : [[313,209]      , [302,202]      , [300,201]      , [297,201]      , [295,201]      , [290,200]      , [280,196]      , [277,192]      , [273,188]      , [278,179]      , [279,174]      , [282,162]      , [285,139]      , [296,133]      , [298,131]      , [301,131]      , [303,131]      , [312,137]      , [318,137]      , [329,140]      , [329,138]      , [339,144]      , [339,146]      , [334,151]      , [340,154]      , [340,155]      , [340,161]      , [336,163]      , [335,164]      , [335,169]      , [339,168]      , [341,179]      , [346,188]      , [345,197]      , [345,213]      , [335,216]      , [324,223]      , [324,216]      , [318,212]      , [313,209]      ],
        17        : [[423,347]      , [426,348]      , [426,349]      , [429,350]      , [431,354]      , [433,353]      , [437,352]      , [445,361]      , [456,361]      , [464,366]      , [470,362]      , [474,364]      , [477,365]      , [479,370]      , [481,373]      , [484,377]      , [491,384]      , [495,387]      , [494,391]      , [496,394]      , [499,397]      , [499,406]      , [490,401]      , [491,402]      , [481,404]      , [481,406]      , [484,407]      , [482,413]      , [479,413]      , [480,420]      , [469,420]      , [471,416]      , [466,409]      , [464,407]      , [454,398]      , [451,396]      , [448,394]      , [440,391]      , [436,391]      , [433,392]      , [433,393]      , [427,393]      , [426,386]      , [421,389]      , [410,373]      , [429,365]      , [428,363]      , [428,362]      , [426,361]      , [424,359]      , [417,358]      , [414,359]      , [413,360]      , [410,363]      , [409,365]      , [407,365]      , [406,360]      , [408,360]      , [409,355]      , [410,348]      , [408,343]      , [414,339]      , [418,345]      , [417,343]      , [423,347]      ],
        18        : [[538,357]      , [553,346]      , [567,338]      , [574,334]      , [581,328]      , [589,326]      , [592,337]      , [604,337]      , [598,349]      , [586,359]      , [587,370]      , [581,384]      , [573,402]      , [568,412]      , [559,417]      , [560,422]      , [559,423]      , [557,422]      , [553,427]      , [547,423]      , [540,427]      , [535,425]      , [532,428]      , [527,428]      , [522,428]      , [514,423]      , [513,419]      , [512,417]      , [512,416]      , [512,414]      , [507,411]      , [510,409]      , [510,408]      , [509,405]      , [506,406]      , [498,399]      , [501,396]      , [497,395]      , [496,385]      , [502,382]      , [502,378]      , [504,372]      , [509,373]      , [512,368]      , [511,373]      , [519,372]      , [518,361]      , [521,361]      , [535,359]      , [538,357]      ],
        19        : [[591,355]      , [594,352]      , [596,352]      , [598,350]      , [604,341]      , [605,339]      , [607,336]      , [610,337]      , [614,339]      , [615,345]      , [620,346]      , [626,347]      , [629,348]      , [630,351]      , [635,352]      , [639,352]      , [641,351]      , [645,352]      , [652,353]      , [664,358]      , [670,358]      , [679,357]      , [682,353]      , [689,351]      , [694,349]      , [697,353]      , [698,357]      , [694,359]      , [694,362]      , [692,365]      , [686,372]      , [684,375]      , [680,389]      , [679,393]      , [679,395]      , [680,397]      , [680,399]      , [671,406]      , [674,405]      , [670,409]      , [667,412]      , [665,412]      , [662,416]      , [655,423]      , [653,429]      , [648,437]      , [644,443]      , [639,445]      , [640,452]      , [637,451]      , [630,450]      , [628,448]      , [625,445]      , [624,442]      , [622,440]      , [620,438]      , [615,438]      , [611,434]      , [605,426]      , [599,421]      , [597,419]      , [594,416]      , [592,415]      , [587,413]      , [575,413]      , [570,414]      , [585,378]      , [589,370]      , [586,360]      , [591,355]      ],
        20        : [[485,459]      , [501,450]      , [501,457]      , [502,459]      , [508,462]      , [510,463]      , [511,464]      , [513,464]      , [516,465]      , [521,462]      , [525,466]      , [527,468]      , [528,472]      , [529,475]      , [531,477]      , [533,478]      , [533,480]      , [534,483]      , [531,484]      , [534,488]      , [538,493]      , [554,504]      , [558,512]      , [555,513]      , [571,530]      , [570,537]      , [565,535]      , [559,543]      , [555,541]      , [559,552]      , [534,545]      , [518,543]      , [520,539]      , [519,532]      , [518,528]      , [517,523]      , [516,520]      , [518,519]      , [517,513]      , [519,511]      , [521,508]      , [517,506]      , [506,503]      , [500,503]      , [494,503]      , [490,503]      , [487,505]      , [482,503]      , [473,499]      , [471,489]      , [465,484]      , [461,481]      , [457,481]      , [453,480]      , [485,459]      ],
        21        : [[361,409]      , [375,394]      , [383,386]      , [388,382]      , [403,376]      , [409,374]      , [422,391]      , [426,388]      , [426,391]      , [426,394]      , [430,394]      , [432,394]      , [434,392]      , [438,393]      , [447,393]      , [455,400]      , [461,406]      , [471,414]      , [468,422]      , [480,421]      , [481,423]      , [482,423]      , [482,421]      , [481,417]      , [481,415]      , [483,410]      , [486,411]      , [484,404]      , [492,404]      , [493,403]      , [500,409]      , [501,403]      , [503,406]      , [509,407]      , [506,409]      , [506,414]      , [508,413]      , [510,417]      , [517,428]      , [525,433]      , [537,426]      , [543,426]      , [547,427]      , [547,436]      , [544,436]      , [544,444]      , [544,455]      , [536,460]      , [530,464]      , [528,457]      , [524,463]      , [513,463]      , [509,462]      , [504,459]      , [502,455]      , [502,453]      , [502,450]      , [502,448]      , [449,480]      , [444,475]      , [442,468]      , [423,453]      , [407,444]      , [402,440]      , [396,438]      , [385,433]      , [381,429]      , [373,425]      , [364,419]      , [354,417]      , [361,409]      ],
        22        : [[384,433]      , [402,441]      , [409,447]      , [420,453]      , [424,455]      , [434,464]      , [436,465]      , [438,467]      , [440,468]      , [443,474]      , [445,478]      , [446,477]      , [448,482]      , [445,484]      , [435,489]      , [434,492]      , [434,494]      , [435,496]      , [436,498]      , [432,504]      , [427,495]      , [411,505]      , [403,509]      , [394,504]      , [382,490]      , [378,484]      , [380,475]      , [379,472]      , [379,463]      , [379,448]      , [381,445]      , [379,428]      , [384,433]      ],
        23        : [[345,289]      , [343,281]      , [354,277]      , [359,275]      , [365,282]      , [362,286]      , [366,293]      , [371,294]      , [373,294]      , [378,294]      , [385,297]      , [393,300]      , [394,304]      , [399,310]      , [402,313]      , [404,313]      , [406,316]      , [408,317]      , [411,326]      , [411,328]      , [411,330]      , [410,332]      , [414,334]      , [406,347]      , [411,341]      , [408,354]      , [406,362]      , [406,363]      , [406,364]      , [407,365]      , [410,366]      , [413,361]      , [414,359]      , [427,362]      , [426,364]      , [425,365]      , [423,366]      , [397,378]      , [393,380]      , [387,383]      , [383,383]      , [379,382]      , [376,379]      , [373,378]      , [359,371]      , [353,368]      , [349,370]      , [347,367]      , [344,365]      , [345,362]      , [341,358]      , [333,350]      , [333,356]      , [324,344]      , [323,343]      , [322,341]      , [321,340]      , [320,337]      , [323,331]      , [325,328]      , [338,298]      , [345,298]      , [348,300]      , [351,300]      , [349,294]      , [345,291]      , [345,289]      ],
        24        : [[294,277]      , [299,282]      , [309,283]      , [314,292]      , [317,291]      , [322,297]      , [328,299]      , [336,299]      , [325,324]      , [318,339]      , [306,351]      , [297,348]      , [276,343]      , [271,336]      , [269,333]      , [267,322]      , [266,318]      , [248,320]      , [250,312]      , [252,313]      , [256,307]      , [261,298]      , [267,290]      , [271,290]      , [269,280]      , [273,278]      , [283,282]      , [285,280]      , [294,277]      ],
        25        : [[195,300]      , [196,297]      , [200,295]      , [203,292]      , [207,287]      , [208,280]      , [208,274]      , [207,263]      , [200,260]      , [198,257]      , [197,255]      , [197,252]      , [197,250]      , [196,248]      , [195,246]      , [195,244]      , [196,239]      , [205,233]      , [209,232]      , [212,237]      , [213,237]      , [217,240]      , [221,246]      , [224,249]      , [225,247]      , [227,253]      , [234,252]      , [235,255]      , [240,260]      , [246,264]      , [251,267]      , [255,270]      , [255,272]      , [261,275]      , [263,281]      , [265,283]      , [269,288]      , [259,297]      , [261,298]      , [256,306]      , [250,313]      , [246,318]      , [247,320]      , [240,322]      , [241,316]      , [233,318]      , [234,316]      , [227,316]      , [222,316]      , [221,318]      , [218,318]      , [213,318]      , [210,313]      , [208,309]      , [197,317]      , [196,313]      , [193,304]      , [195,300]      ],
        26        : [[238,169]      , [247,181]      , [257,181]      , [259,187]      , [263,192]      , [272,197]      , [275,194]      , [277,195]      , [279,198]      , [282,197]      , [286,201]      , [302,202]      , [305,205]      , [308,208]      , [305,212]      , [303,215]      , [296,225]      , [297,221]      , [293,226]      , [291,228]      , [286,237]      , [285,240]      , [276,244]      , [278,243]      , [271,249]      , [269,251]      , [268,251]      , [266,253]      , [263,258]      , [264,265]      , [257,271]      , [251,266]      , [244,261]      , [235,253]      , [222,245]      , [217,239]      , [210,232]      , [201,222]      , [198,217]      , [209,204]      , [211,191]      , [224,156]      , [238,169]      ],
        27        : [[758,270]      , [776,287]      , [794,305]      , [828,339]      , [819,342]      , [805,347]      , [797,353]      , [789,360]      , [781,365]      , [774,372]      , [768,380]      , [762,387]      , [760,390]      , [758,395]      , [755,396]      , [752,397]      , [740,397]      , [737,397]      , [737,389]      , [735,391]      , [734,391]      , [733,386]      , [733,381]      , [728,380]      , [729,376]      , [721,370]      , [721,364]      , [715,360]      , [712,355]      , [710,350]      , [711,341]      , [709,336]      , [708,332]      , [705,332]      , [703,330]      , [702,329]      , [701,327]      , [700,325]      , [701,323]      , [693,318]      , [700,314]      , [702,306]      , [705,305]      , [709,303]      , [710,300]      , [713,295]      , [709,294]      , [716,290]      , [718,283]      , [726,270]      , [728,271]      , [732,259]      , [739,251]      , [758,270]      ],
        28        : [[660,460]      , [648,456]      , [645,454]      , [640,454]      , [641,449]      , [642,445]      , [646,441]      , [649,438]      , [653,431]      , [657,423]      , [663,416]      , [665,413]      , [667,413]      , [670,411]      , [679,400]      , [681,397]      , [680,395]      , [681,389]      , [686,373]      , [683,379]      , [693,365]      , [696,361]      , [696,360]      , [700,357]      , [703,363]      , [705,373]      , [714,373]      , [723,372]      , [726,376]      , [727,376]      , [727,381]      , [731,381]      , [734,393]      , [737,391]      , [736,398]      , [755,398]      , [746,412]      , [740,418]      , [736,429]      , [731,440]      , [726,461]      , [727,471]      , [725,467]      , [724,464]      , [724,460]      , [724,457]      , [724,454]      , [722,452]      , [720,451]      , [715,451]      , [712,451]      , [716,439]      , [709,439]      , [709,443]      , [707,452]      , [708,454]      , [711,460]      , [720,463]      , [722,466]      , [723,468]      , [722,473]      , [722,476]      , [726,477]      , [722,482]      , [716,488]      , [710,491]      , [710,488]      , [710,487]      , [708,485]      , [705,484]      , [699,484]      , [695,482]      , [690,479]      , [685,472]      , [679,471]      , [678,466]      , [675,464]      , [668,468]      , [665,463]      , [660,460]      ],
        29        : [[574,414]      , [577,414]      , [589,416]      , [592,417]      , [604,426]      , [610,432]      , [611,438]      , [621,440]      , [627,448]      , [644,455]      , [658,460]      , [660,463]      , [678,469]      , [673,472]      , [667,485]      , [661,483]      , [659,482]      , [654,487]      , [645,487]      , [646,492]      , [641,499]      , [627,517]      , [625,520]      , [626,522]      , [625,525]      , [623,528]      , [616,530]      , [613,531]      , [613,534]      , [613,537]      , [610,539]      , [609,541]      , [606,541]      , [605,543]      , [602,547]      , [605,549]      , [599,551]      , [598,540]      , [589,544]      , [596,534]      , [585,534]      , [582,529]      , [577,515]      , [569,517]      , [559,509]      , [533,486]      , [535,480]      , [530,474]      , [525,461]      , [528,461]      , [532,463]      , [534,462]      , [544,459]      , [543,449]      , [545,441]      , [547,435]      , [548,440]      , [548,427]      , [555,426]      , [560,427]      , [563,420]      , [560,418]      , [564,415]      , [571,416]      , [569,415]      , [574,414]      ],
        30        : [[627,518]      , [642,499]      , [649,489]      , [660,484]      , [667,484]      , [674,475]      , [682,472]      , [691,483]      , [696,484]      , [709,486]      , [708,494]      , [700,495]      , [697,499]      , [694,501]      , [695,504]      , [694,506]      , [693,509]      , [686,510]      , [683,511]      , [682,507]      , [679,505]      , [677,512]      , [675,512]      , [672,508]      , [672,507]      , [667,506]      , [666,510]      , [665,509]      , [662,511]      , [659,513]      , [659,515]      , [657,518]      , [652,524]      , [650,530]      , [661,529]      , [659,535]      , [653,536]      , [648,540]      , [645,542]      , [642,544]      , [640,546]      , [638,549]      , [637,552]      , [634,554]      , [621,561]      , [618,563]      , [612,567]      , [610,570]      , [608,574]      , [608,578]      , [605,581]      , [595,588]      , [593,590]      , [590,593]      , [588,594]      , [584,595]      , [582,593]      , [573,597]      , [569,598]      , [560,603]      , [557,603]      , [553,602]      , [551,598]      , [548,595]      , [547,594]      , [543,592]      , [541,591]      , [540,592]      , [540,594]      , [554,603]      , [553,606]      , [551,609]      , [548,610]      , [543,611]      , [539,608]      , [535,614]      , [527,611]      , [531,618]      , [516,608]      , [521,602]      , [521,600]      , [520,592]      , [515,595]      , [514,592]      , [518,591]      , [520,589]      , [521,585]      , [514,583]      , [517,581]      , [515,576]      , [514,573]      , [512,572]      , [510,570]      , [510,565]      , [513,562]      , [512,562]      , [514,558]      , [517,553]      , [519,553]      , [519,545]      , [535,547]      , [562,553]      , [557,545]      , [565,537]      , [571,539]      , [572,530]      , [575,530]      , [565,522]      , [565,520]      , [568,519]      , [574,516]      , [577,518]      , [579,520]      , [579,523]      , [579,525]      , [580,527]      , [581,529]      , [582,531]      , [584,537]      , [586,536]      , [592,535]      , [592,537]      , [592,540]      , [593,542]      , [595,547]      , [597,543]      , [598,552]      , [604,551]      , [605,550]      , [604,544]      , [611,541]      , [613,540]      , [614,532]      , [625,528]      , [627,518]      ],
        31        : [[461,483]      , [466,486]      , [468,491]      , [471,495]      , [478,503]      , [486,507]      , [496,503]      , [499,505]      , [506,505]      , [511,506]      , [519,507]      , [518,511]      , [515,516]      , [515,521]      , [515,525]      , [517,527]      , [518,530]      , [518,550]      , [517,556]      , [505,563]      , [511,572]      , [512,574]      , [514,575]      , [515,576]      , [514,582]      , [515,583]      , [519,587]      , [517,590]      , [513,591]      , [514,597]      , [520,594]      , [519,603]      , [515,609]      , [521,610]      , [523,612]      , [526,618]      , [518,623]      , [515,617]      , [513,617]      , [511,618]      , [509,618]      , [503,617]      , [500,612]      , [500,607]      , [501,599]      , [495,599]      , [495,604]      , [489,603]      , [488,599]      , [480,600]      , [474,593]      , [476,596]      , [474,587]      , [471,588]      , [470,585]      , [473,582]      , [469,582]      , [467,583]      , [465,580]      , [463,581]      , [460,581]      , [458,581]      , [456,581]      , [455,580]      , [453,579]      , [442,575]      , [443,570]      , [438,561]      , [435,555]      , [434,553]      , [434,551]      , [432,549]      , [419,536]      , [413,524]      , [403,511]      , [427,497]      , [431,505]      , [434,505]      , [435,501]      , [437,499]      , [435,495]      , [435,491]      , [443,486]      , [451,479]      , [461,483]      ],
        32        : [[456,582]      , [460,583]      , [463,582]      , [466,585]      , [469,584]      , [474,590]      , [471,592]      , [473,593]      , [475,596]      , [478,600]      , [481,600]      , [487,601]      , [489,607]      , [493,605]      , [494,612]      , [499,618]      , [506,620]      , [505,625]      , [497,625]      , [491,623]      , [485,629]      , [490,628]      , [501,626]      , [506,629]      , [507,630]      , [509,634]      , [510,636]      , [502,640]      , [498,643]      , [493,647]      , [495,652]      , [491,652]      , [490,657]      , [488,660]      , [484,664]      , [483,665]      , [480,667]      , [479,665]      , [477,662]      , [479,657]      , [479,654]      , [479,650]      , [477,648]      , [474,645]      , [472,646]      , [475,651]      , [474,654]      , [473,659]      , [467,657]      , [466,654]      , [465,648]      , [464,648]      , [463,648]      , [461,647]      , [457,644]      , [452,630]      , [450,624]      , [448,621]      , [444,614]      , [444,611]      , [443,604]      , [448,600]      , [442,594]      , [440,585]      , [444,577]      , [448,579]      , [452,581]      , [456,582]      ],
        33        : [[474,631]      , [470,631]      , [472,643]      , [473,639]      , [474,645]      , [476,631]      , [474,628]      , [474,631]      ],
        34        : [[446,628]      , [448,636]      , [454,650]      , [445,643]      , [449,652]      , [450,648]      , [449,659]      , [440,655]      , [443,661]      , [451,664]      , [452,655]      , [455,658]      , [457,661]      , [460,663]      , [464,666]      , [468,665]      , [471,671]      , [473,675]      , [470,679]      , [468,682]      , [467,684]      , [464,688]      , [462,689]      , [459,692]      , [450,696]      , [446,696]      , [451,683]      , [458,684]      , [452,672]      , [452,677]      , [445,676]      , [443,674]      , [437,678]      , [443,678]      , [446,678]      , [451,682]      , [438,693]      , [444,690]      , [444,698]      , [442,701]      , [433,700]      , [434,695]      , [430,694]      , [432,690]      , [425,690]      , [425,684]      , [424,680]      , [417,679]      , [416,677]      , [414,673]      , [414,671]      , [415,666]      , [419,667]      , [416,657]      , [428,658]      , [428,655]      , [428,649]      , [431,648]      , [433,647]      , [435,649]      , [437,647]      , [440,645]      , [445,637]      , [446,634]      , [442,634]      , [444,628]      , [446,628]      ],
        35        : [[514,636]      , [514,643]      , [511,650]      , [506,647]      , [510,653]      , [490,663]      , [493,654]      , [498,652]      , [498,647]      , [500,647]      , [503,644]      , [507,645]      , [508,644]      , [507,642]      , [512,636]      , [514,636]      ],
        36        : [[470,643]      , [471,644]      , [471,643]      , [470,643]      ],
        37        : [[469,644]      , [470,645]      , [470,644]      , [469,644]      ],
        38        : [[470,645]      , [471,646]      , [471,645]      , [470,645]      ],
        39        : [[370,606]      , [370,604]      , [376,599]      , [378,597]      , [402,577]      , [404,575]      , [410,569]      , [413,569]      , [417,569]      , [422,577]      , [425,580]      , [425,581]      , [423,586]      , [423,587]      , [424,590]      , [431,592]      , [434,593]      , [437,587]      , [439,587]      , [444,599]      , [443,611]      , [447,624]      , [442,628]      , [442,630]      , [441,636]      , [444,635]      , [437,648]      , [428,645]      , [427,649]      , [427,657]      , [414,656]      , [419,666]      , [414,666]      , [413,671]      , [413,674]      , [415,675]      , [415,680]      , [420,681]      , [422,683]      , [424,688]      , [421,687]      , [422,690]      , [422,693]      , [426,691]      , [429,692]      , [428,695]      , [433,696]      , [431,702]      , [436,705]      , [432,711]      , [417,700]      , [408,700]      , [396,694]      , [395,684]      , [398,684]      , [397,678]      , [394,676]      , [390,672]      , [391,668]      , [395,661]      , [395,659]      , [395,657]      , [395,655]      , [393,647]      , [391,649]      , [388,645]      , [382,634]      , [380,629]      , [384,628]      , [382,624]      , [380,619]      , [376,620]      , [377,613]      , [373,612]      , [368,611]      , [370,606]      ],
        40        : [[377,530]      , [378,525]      , [389,519]      , [394,517]      , [397,515]      , [400,512]      , [404,514]      , [405,515]      , [406,518]      , [407,519]      , [415,529]      , [415,533]      , [418,537]      , [422,542]      , [429,544]      , [432,550]      , [435,556]      , [441,571]      , [445,575]      , [433,592]      , [423,588]      , [424,586]      , [425,583]      , [425,581]      , [425,579]      , [417,566]      , [411,569]      , [408,570]      , [402,577]      , [399,579]      , [380,595]      , [374,599]      , [372,604]      , [364,604]      , [362,604]      , [361,604]      , [359,604]      , [356,603]      , [348,596]      , [347,593]      , [347,590]      , [348,588]      , [348,586]      , [349,582]      , [347,579]      , [344,576]      , [347,572]      , [346,571]      , [348,569]      , [350,567]      , [354,565]      , [357,564]      , [359,562]      , [360,560]      , [362,558]      , [364,555]      , [368,552]      , [370,550]      , [373,544]      , [366,538]      , [376,536]      , [376,534]      , [376,532]      , [377,530]      ],
        41        : [[325,486]      , [328,485]      , [332,488]      , [335,488]      , [343,491]      , [351,495]      , [359,495]      , [380,493]      , [386,494]      , [389,501]      , [393,505]      , [397,508]      , [398,506]      , [401,511]      , [378,526]      , [374,534]      , [369,539]      , [371,549]      , [357,558]      , [362,562]      , [347,567]      , [344,560]      , [345,553]      , [346,550]      , [339,546]      , [339,542]      , [338,542]      , [335,539]      , [337,535]      , [332,532]      , [330,524]      , [336,517]      , [330,507]      , [321,507]      , [321,503]      , [313,498]      , [315,495]      , [321,487]      , [325,486]      ],
        42        : [[308,496]      , [306,496]      , [299,493]      , [297,492]      , [294,490]      , [287,485]      , [287,480]      , [286,477]      , [298,467]      , [300,464]      , [318,450]      , [337,432]      , [340,430]      , [350,420]      , [352,419]      , [354,418]      , [356,419]      , [358,419]      , [361,420]      , [363,420]      , [366,421]      , [371,424]      , [370,426]      , [378,428]      , [379,436]      , [379,438]      , [379,446]      , [378,460]      , [378,472]      , [378,484]      , [378,486]      , [380,489]      , [378,491]      , [377,493]      , [365,494]      , [362,494]      , [347,494]      , [336,485]      , [322,484]      , [321,488]      , [313,496]      , [308,496]      ],
        43        : [[329,352]      , [340,358]      , [346,368]      , [359,372]      , [383,384]      , [365,403]      , [357,413]      , [322,444]      , [287,475]      , [286,471]      , [279,473]      , [281,473]      , [272,466]      , [276,464]      , [270,456]      , [273,453]      , [267,453]      , [262,445]      , [259,445]      , [257,442]      , [259,433]      , [262,434]      , [259,430]      , [265,423]      , [252,419]      , [250,416]      , [249,415]      , [248,413]      , [247,412]      , [247,411]      , [247,410]      , [247,408]      , [248,405]      , [261,395]      , [264,391]      , [287,370]      , [308,350]      , [313,345]      , [313,347]      , [319,340]      , [329,352]      ],
        44        : [[265,319]      , [266,324]      , [268,333]      , [271,337]      , [276,343]      , [296,349]      , [304,351]      , [301,356]      , [298,357]      , [294,361]      , [273,382]      , [265,388]      , [260,393]      , [249,405]      , [243,407]      , [241,404]      , [240,402]      , [237,400]      , [235,399]      , [231,397]      , [230,395]      , [228,391]      , [232,389]      , [229,384]      , [226,380]      , [220,377]      , [217,368]      , [221,364]      , [219,354]      , [229,349]      , [222,336]      , [222,328]      , [233,325]      , [255,319]      , [265,319]      ],
        45        : [[151,316]      , [151,314]      , [150,312]      , [150,310]      , [151,303]      , [159,298]      , [166,298]      , [169,299]      , [173,301]      , [182,302]      , [193,301]      , [196,319]      , [208,311]      , [215,323]      , [220,317]      , [228,317]      , [240,318]      , [235,330]      , [221,320]      , [222,333]      , [220,333]      , [227,348]      , [223,349]      , [223,355]      , [221,354]      , [219,359]      , [218,361]      , [217,369]      , [217,371]      , [218,378]      , [232,384]      , [229,391]      , [227,396]      , [223,394]      , [220,392]      , [218,391]      , [217,390]      , [216,389]      , [214,386]      , [214,384]      , [213,381]      , [211,375]      , [207,375]      , [206,361]      , [197,359]      , [198,353]      , [192,348]      , [184,342]      , [176,340]      , [170,335]      , [163,329]      , [163,324]      , [155,324]      , [154,321]      , [152,319]      , [151,316]      ],
        46        : [[174,233]      , [196,217]      , [206,231]      , [203,233]      , [194,241]      , [194,244]      , [193,246]      , [195,248]      , [195,250]      , [196,252]      , [196,255]      , [197,257]      , [204,265]      , [209,273]      , [208,283]      , [203,290]      , [196,301]      , [186,302]      , [174,300]      , [170,299]      , [169,297]      , [165,297]      , [154,298]      , [156,303]      , [148,307]      , [140,298]      , [140,288]      , [132,285]      , [129,282]      , [126,279]      , [126,273]      , [125,269]      , [174,233]      ],
        47        : [[104,192]      , [118,177]      , [150,158]      , [169,148]      , [170,151]      , [172,153]      , [172,156]      , [171,167]      , [171,174]      , [171,181]      , [174,188]      , [180,201]      , [184,206]      , [192,211]      , [195,216]      , [175,231]      , [153,247]      , [125,268]      , [123,259]      , [118,252]      , [115,243]      , [110,238]      , [106,224]      , [103,214]      , [95,213]       , [85,213]       , [104,192]      ],
        48        : [[353,82]       , [356,79]       , [363,80]       , [367,80]       , [377,81]       , [393,82]       , [396,82]       , [402,82]       , [405,83]       , [407,84]       , [409,88]       , [410,91]       , [405,96]       , [406,98]       , [408,104]      , [412,102]      , [416,99]       , [420,96]       , [422,95]       , [425,93]       , [427,93]       , [432,94]       , [432,105]      , [432,108]      , [432,114]      , [437,120]      , [437,126]      , [438,133]      , [433,135]      , [438,143]      , [432,147]      , [409,148]      , [340,148]      , [341,139]      , [336,138]      , [338,125]      , [337,124]      , [336,124]      , [336,123]      , [335,121]      , [336,119]      , [336,117]      , [337,113]      , [335,108]      , [338,105]      , [341,103]      , [346,103]      , [349,103]      , [349,97]       , [348,86]       , [353,82]       ],
        49        : [[285,76]       , [309,77]       , [322,78]       , [353,79]       , [348,92]       , [348,88]       , [348,102]      , [345,102]      , [339,101]      , [337,103]      , [333,107]      , [335,111]      , [335,115]      , [336,118]      , [335,118]      , [335,120]      , [334,124]      , [336,125]      , [336,128]      , [338,141]      , [334,139]      , [331,136]      , [326,138]      , [319,136]      , [313,135]      , [312,139]      , [308,131]      , [299,131]      , [290,123]      , [288,118]      , [288,108]      , [282,104]      , [283,97]       , [275,83]       , [272,76]       , [285,76]       ],
        50        : [[229,73]       , [249,74]       , [271,75]       , [274,84]       , [282,96]       , [281,105]      , [287,107]      , [287,119]      , [290,124]      , [292,127]      , [295,128]      , [295,131]      , [294,135]      , [287,140]      , [285,147]      , [280,167]      , [275,185]      , [274,190]      , [272,195]      , [259,189]      , [264,188]      , [256,182]      , [252,179]      , [238,176]      , [236,162]      , [229,161]      , [224,153]      , [219,147]      , [218,145]      , [214,142]      , [213,140]      , [213,138]      , [213,132]      , [213,130]      , [214,108]      , [214,93]       , [215,72]       , [229,73]       ],
        51        : [[188,73]       , [190,75]       , [200,72]       , [203,72]       , [214,72]       , [213,94]       , [213,109]      , [212,130]      , [212,133]      , [211,139]      , [212,141]      , [214,144]      , [225,150]      , [222,160]      , [210,191]      , [208,197]      , [210,201]      , [208,205]      , [207,207]      , [200,212]      , [198,212]      , [194,213]      , [189,208]      , [186,206]      , [180,200]      , [179,199]      , [179,195]      , [178,193]      , [173,180]      , [172,170]      , [173,168]      , [172,166]      , [173,164]      , [175,151]      , [173,158]      , [171,147]      , [167,132]      , [164,122]      , [161,119]      , [161,107]      , [152,108]      , [151,99]       , [156,96]       , [149,94]       , [150,96]       , [144,97]       , [135,98]       , [136,95]       , [126,100]      , [125,90]       , [134,95]       , [137,85]       , [140,86]       , [156,81]       , [159,78]       , [165,80]       , [167,77]       , [172,76]       , [174,76]       , [176,78]       , [178,76]       , [180,75]       , [179,73]       , [185,69]       , [186,70]       , [187,72]       , [188,73]       ],
        52        : [[94,112]       , [98,122]       , [98,136]       , [99,150]       , [103,153]      , [100,159]      , [99,163]       , [106,165]      , [103,176]      , [113,180]      , [104,186]      , [104,193]      , [100,195]      , [96,199]       , [92,203]       , [85,211]       , [82,215]       , [73,213]       , [72,210]       , [67,204]       , [59,196]       , [54,190]       , [55,190]       , [56,188]       , [43,185]       , [26,172]       , [26,170]       , [24,166]       , [25,164]       , [25,161]       , [28,159]       , [29,156]       , [31,152]       , [30,146]       , [38,146]       , [38,140]       , [42,140]       , [45,133]       , [50,133]       , [51,130]       , [55,127]       , [58,124]       , [61,123]       , [65,122]       , [63,119]       , [67,109]       , [98,99]        , [94,112]       ],
    };
  }
});
})(jQuery);



/*!
 * The following copyright notice may not be removed under any circumstances.
 * 
 * Copyright:
 * Created by Nathan Willis,,, with FontForge 2.0 (http://fontforge.sf.net)
 * 
 * License information:
 * http://scripts.sil.org/OFL
 */
Raphael.registerFont({"w":1263,"face":{"font-family":"News Cycle","font-weight":500,"font-stretch":"normal","units-per-em":"2048","panose-1":"2 0 5 3 0 0 0 0 0 0","ascent":"1638","descent":"-410","x-height":"12","bbox":"-63 -1532.04 1589 445","underline-thickness":"102","underline-position":"-204","unicode-range":"U+0041-U+007A"},"glyphs":{" ":{},"A":{"d":"25,0r432,-1515r216,0r432,1515r-154,0r-130,-478r-509,0r-133,478r-154,0xm346,-602r440,0r-221,-787","w":1130,"k":{"C":22,"G":22,"O":22,"Q":22,"T":153,"U":20,"V":92,"W":72,"Y":134,"c":14,"e":14,"o":14,"q":14,"d":13,"f":35,"t":57,"v":56,"w":50,"y":67}},"B":{"d":"1064,-410v0,261,-178,410,-456,410r-473,0r0,-1515r473,0v226,-7,421,150,421,363v0,207,-89,315,-255,352v162,41,290,181,290,390xm924,-410v4,-187,-130,-316,-316,-316r-325,0r0,602r325,0v213,1,312,-83,316,-286xm895,-1152v0,-165,-112,-239,-287,-239r-325,0r0,538r325,0v195,1,287,-103,287,-299","w":1132,"k":{"T":57,"X":41,"Y":26,"Z":13,"f":12,"g":15,"s":13,"t":12,"v":9,"w":9,"x":32,"y":9,"z":20}},"C":{"d":"618,-108v193,0,342,-159,342,-355r146,23v-52,165,-118,324,-260,403v-159,89,-400,51,-512,-37v-212,-167,-296,-532,-236,-906v36,-226,134,-415,314,-506v150,-76,370,-44,465,42v55,50,113,114,144,182v37,82,51,116,63,175r-152,41v-16,-125,-43,-183,-90,-252v-45,-65,-125,-110,-224,-110v-260,0,-390,216,-390,649v0,185,27,337,82,454v62,131,165,197,308,197","w":1174,"k":{"T":29,"X":50,"Y":19,"g":26,"s":21,"x":24,"z":14}},"D":{"d":"135,0r0,-1515r361,0v335,0,539,149,614,446v62,251,41,569,-54,753v-99,192,-285,316,-560,316r-361,0xm496,-124v340,7,509,-252,502,-621v-6,-332,-66,-517,-284,-609v-111,-47,-275,-35,-431,-37r0,1267r213,0","w":1214,"k":{"A":22,"J":23,"T":76,"V":19,"W":13,"X":64,"Y":55,"Z":42,"a":9,"g":12,"x":21,"z":16}},"E":{"d":"135,0r0,-1515r821,0r0,124r-673,0r0,533r483,0r0,124r-483,0r0,601r711,0r0,133r-859,0","w":1062,"k":{"C":48,"G":48,"O":48,"Q":48,"S":19,"a":11,"c":50,"e":50,"o":50,"q":50,"d":49,"f":49,"g":17,"s":16,"t":65,"u":22,"v":109,"w":96,"y":127}},"F":{"d":"135,0r0,-1515r821,0r0,124r-673,0r0,533r483,0r0,124r-483,0r0,734r-148,0","w":1024,"k":{"A":155,"C":48,"G":48,"O":48,"Q":48,"J":271,"S":27,"a":161,"c":144,"e":144,"o":144,"q":144,"d":144,"i":32,"j":32,"m":136,"n":136,"p":136,"r":136,"f":68,"g":146,"s":122,"t":56,"u":133,"v":105,"w":103,"x":190,"y":109,"z":197}},"G":{"d":"967,-1063v-27,-182,-124,-345,-327,-345v-164,0,-264,88,-325,202v-114,213,-110,705,-7,898v71,133,180,200,331,200v187,0,296,-108,325,-324v6,-47,9,-100,9,-159r-337,0r0,-124r482,0r0,715r-120,0r0,-192v-75,104,-155,170,-239,192v-105,28,-236,20,-335,-30v-235,-120,-344,-387,-344,-726v0,-295,82,-516,236,-660v148,-138,408,-157,585,-31v95,68,167,182,211,348","w":1246,"k":{"T":48,"V":15,"Y":37,"f":14,"g":11,"t":11}},"H":{"d":"135,0r0,-1515r148,0r0,657r688,0r0,-657r148,0r0,1515r-148,0r0,-734r-688,0r0,734r-148,0","w":1254,"k":{"a":10,"b":10,"h":10,"k":10,"c":14,"e":14,"o":14,"q":14,"d":15,"i":10,"j":10,"m":10,"n":10,"p":10,"r":10,"g":19,"l":11,"s":10,"u":12}},"I":{"d":"135,0r0,-1515r148,0r0,1515r-148,0","w":418,"k":{"a":10,"b":10,"h":10,"k":10,"c":14,"e":14,"o":14,"q":14,"d":15,"i":10,"j":10,"m":10,"n":10,"p":10,"r":10,"g":19,"l":11,"s":10,"u":12}},"J":{"d":"761,-429v-3,277,-110,438,-370,445v-199,5,-318,-120,-366,-260r103,-53v36,89,124,189,258,189v177,0,227,-133,227,-321r0,-1086r148,0r0,1086","w":896,"k":{"A":13,"a":13,"b":9,"h":9,"k":9,"c":14,"e":14,"o":14,"q":14,"d":14,"i":10,"j":10,"m":14,"n":14,"p":14,"r":14,"g":24,"l":10,"s":13,"u":13,"z":18}},"K":{"d":"135,0r0,-1515r149,0r0,824r617,-824r159,0r-434,569r489,946r-166,0r-417,-822r-248,327r0,495r-149,0","w":1140,"k":{"C":67,"G":67,"O":67,"Q":67,"S":41,"c":44,"e":44,"o":44,"q":44,"d":42,"f":43,"g":18,"s":12,"t":67,"u":14,"v":94,"w":88,"y":103}},"L":{"d":"135,0r0,-1515r148,0r0,1373r672,0r0,142r-820,0","w":980,"k":{"C":68,"G":68,"O":68,"Q":68,"S":14,"T":230,"U":38,"V":198,"W":128,"Y":223,"c":26,"e":26,"o":26,"q":26,"d":24,"f":39,"t":65,"u":9,"v":130,"w":102,"y":153}},"M":{"d":"128,0r0,-1515r268,0r324,1163r10,0r324,-1163r268,0r0,1515r-148,0r0,-1374r-10,0r-382,1374r-114,0r-382,-1374r-10,0r0,1374r-148,0","w":1457,"k":{"a":10,"b":10,"h":10,"k":10,"c":14,"e":14,"o":14,"q":14,"d":15,"i":10,"j":10,"m":10,"n":10,"p":10,"r":10,"g":19,"l":11,"s":10,"u":12}},"N":{"d":"128,0r0,-1515r236,0r611,1154r0,-1154r148,0r0,1515r-127,0r-720,-1368r0,1368r-148,0","w":1251,"k":{"a":10,"b":10,"h":10,"k":10,"c":14,"e":14,"o":14,"q":14,"d":15,"i":10,"j":10,"m":10,"n":10,"p":10,"r":10,"g":19,"l":11,"s":10,"u":12}},"O":{"d":"99,-977v51,-296,196,-555,539,-555v256,0,387,159,466,348v53,128,79,272,79,432v0,293,-78,508,-227,652v-122,118,-347,154,-520,72v-291,-138,-409,-533,-337,-949xm641,-1408v-270,5,-366,214,-400,456v-44,316,12,664,211,792v98,63,248,69,348,12v178,-100,235,-333,235,-604v0,-219,-40,-389,-121,-510v-53,-80,-145,-149,-273,-146","k":{"A":20,"J":17,"T":72,"V":21,"W":13,"X":58,"Y":55,"Z":38,"g":12,"x":22,"z":15}},"P":{"d":"664,-1515v278,-16,470,258,382,551v-48,160,-171,272,-382,272r-381,0r0,692r-148,0r0,-1515r529,0xm920,-1104v0,-201,-153,-287,-357,-287r-280,0r0,575r280,0v205,0,357,-86,357,-288","w":1136,"k":{"A":105,"J":231,"X":42,"Z":14,"a":27,"c":53,"e":53,"o":53,"q":53,"d":60,"m":9,"n":9,"p":9,"r":9,"g":54,"s":17}},"Q":{"d":"730,9v3,111,21,138,125,138r264,0r0,124r-129,0v-206,-3,-251,7,-336,-41v-68,-38,-70,-98,-72,-218v-264,-43,-408,-256,-470,-504v-82,-326,-2,-690,156,-874v79,-92,206,-168,370,-166v256,3,390,158,466,348v175,438,66,1110,-374,1193xm641,-1408v-270,5,-366,214,-400,456v-44,316,12,664,211,792v98,63,248,69,348,12v178,-100,235,-333,235,-604v0,-219,-40,-389,-121,-510v-53,-80,-145,-149,-273,-146","k":{"A":20,"J":17,"T":72,"V":21,"W":13,"X":58,"Y":55,"Z":38,"g":12,"x":22,"z":15}},"R":{"d":"1068,-1117v0,204,-105,369,-292,401r286,716r-162,0r-276,-692r-341,0r0,692r-148,0r0,-1515r510,0v231,-10,423,168,423,398xm920,-1110v0,-182,-156,-281,-366,-281r-271,0r0,575r376,0v162,-3,261,-113,261,-294","w":1093,"k":{"J":13,"T":41,"X":19,"Y":13,"a":18,"c":37,"e":37,"o":37,"q":37,"d":39,"m":11,"n":11,"p":11,"r":11,"g":31,"s":16,"u":15,"x":11}},"S":{"d":"499,-1408v-160,0,-277,106,-277,265v0,87,23,148,68,184v90,72,199,94,320,133v154,49,262,117,319,211v76,126,82,298,-3,435v-76,122,-182,196,-372,196v-286,0,-440,-174,-514,-384r137,-48v41,180,159,308,384,308v176,0,274,-106,279,-266v8,-250,-189,-286,-375,-351v-164,-57,-277,-124,-332,-210v-167,-262,44,-597,361,-597v270,0,376,167,442,367r-130,50v-36,-154,-117,-293,-307,-293","w":1033,"k":{"T":33,"V":11,"X":32,"Y":27,"f":29,"g":13,"s":11,"t":33,"v":29,"w":25,"x":37,"y":31,"z":20}},"T":{"d":"25,-1391r0,-124r1012,0r0,124r-432,0r0,1391r-148,0r0,-1391r-432,0","w":1062,"k":{"A":153,"C":72,"G":72,"O":72,"Q":72,"J":217,"S":18,"Y":-13,"a":179,"c":190,"e":190,"o":190,"q":190,"d":192,"i":41,"j":41,"m":189,"n":189,"p":189,"r":189,"f":76,"g":202,"l":9,"s":179,"t":62,"u":189,"v":165,"w":167,"x":176,"y":163,"z":170}},"U":{"d":"609,16v-290,0,-474,-184,-474,-471r0,-1060r148,0r0,1060v0,206,118,347,326,347v215,0,325,-128,325,-347r0,-1060r151,0r0,1060v-4,276,-183,471,-476,471","w":1213,"k":{"A":20,"J":10,"a":15,"c":14,"e":14,"o":14,"q":14,"d":15,"i":9,"j":9,"m":15,"n":15,"p":15,"r":15,"g":25,"l":10,"s":15,"u":14,"x":9,"z":19}},"V":{"d":"25,-1515r154,0r373,1256r373,-1256r154,0r-450,1515r-154,0","w":1104,"k":{"x":19,"v":16,"A":92,"C":21,"G":21,"O":21,"Q":21,"J":157,"a":95,"c":103,"e":103,"o":103,"q":103,"d":108,"m":67,"n":67,"p":67,"r":67,"f":16,"g":113,"s":84,"t":14,"u":62,"w":18,"y":14,"z":40}},"W":{"d":"25,-1515r154,0r259,1198r10,0r274,-1198r170,0r274,1198r10,0r259,-1198r154,0r-351,1515r-152,0r-274,-1198r-10,0r-274,1198r-152,0","w":1614,"k":{"A":72,"C":13,"G":13,"O":13,"Q":13,"J":105,"a":65,"c":81,"e":81,"o":81,"q":81,"d":83,"m":47,"n":47,"p":47,"r":47,"g":88,"s":54,"t":10,"u":43,"w":11,"x":9,"z":26}},"X":{"d":"25,0r437,-773r-419,-742r154,0r359,634r348,-634r154,0r-428,765r425,750r-156,0r-359,-636r-359,636r-156,0","w":1083,"k":{"v":81,"C":59,"G":59,"O":59,"Q":59,"S":32,"a":19,"c":66,"e":66,"o":66,"q":66,"d":63,"f":39,"g":31,"s":25,"t":45,"u":33,"w":77,"y":83}},"Y":{"d":"25,-1515r154,0r382,713r382,-713r154,0r-462,855r0,660r-148,0r0,-660","w":1122,"k":{"A":134,"C":55,"G":55,"O":55,"Q":55,"J":188,"S":13,"T":-13,"a":143,"c":180,"e":180,"o":180,"q":180,"d":187,"i":20,"j":20,"m":140,"n":140,"p":140,"r":140,"f":44,"g":184,"s":149,"t":42,"u":138,"v":78,"w":84,"x":85,"y":74,"z":105}},"Z":{"d":"68,0r0,-107r825,-1280r-771,0r0,-128r952,0r0,123r-794,1250r788,0r0,142r-1000,0","w":1142,"k":{"C":41,"G":41,"O":41,"Q":41,"a":13,"c":61,"e":61,"o":61,"q":61,"d":60,"m":18,"n":18,"p":18,"r":18,"f":40,"g":23,"s":20,"t":40,"u":33,"v":80,"w":78,"y":82}},"a":{"d":"370,13v-222,0,-351,-182,-280,-395v40,-120,142,-182,266,-227v88,-32,197,-60,325,-85v-1,-185,-53,-250,-218,-258v-111,-5,-227,84,-271,166r-95,-63v75,-143,202,-215,381,-215v230,0,335,130,335,367r0,549v-1,34,20,127,31,148r-133,0v-20,-10,-30,-66,-30,-168v-94,121,-198,181,-311,181xm372,-99v147,2,244,-100,309,-166r0,-317v-127,33,-202,53,-225,60v-117,38,-193,88,-227,150v-17,31,-25,71,-25,120v0,94,82,152,168,153","w":928,"k":{"W":71,"V":96,"T":195,"S":12,"B":14,"D":14,"E":14,"F":14,"H":14,"I":14,"K":14,"L":14,"M":14,"N":14,"P":14,"R":14,"C":10,"G":10,"O":10,"Q":10,"U":23,"Y":173,"f":15,"t":16,"v":13,"w":11,"y":16}},"b":{"d":"547,11v-153,7,-240,-92,-295,-177v0,103,-8,158,-25,166r-133,0v17,-37,26,-85,26,-146r0,-1369r132,0r0,598v29,-59,167,-149,271,-149v356,0,483,503,341,834v-60,140,-148,235,-317,243xm527,-101v200,0,260,-194,260,-409v0,-296,-99,-444,-298,-444v-87,0,-166,50,-237,151r0,525v67,93,127,147,178,164v25,9,58,13,97,13","w":994,"k":{"A":14,"B":15,"D":15,"E":15,"F":15,"H":15,"I":15,"K":15,"L":15,"M":15,"N":15,"P":15,"R":15,"S":9,"T":191,"U":15,"V":104,"W":82,"X":58,"Y":181,"Z":39,"f":20,"t":21,"v":12,"w":10,"x":40,"y":15,"z":21}},"c":{"d":"500,11v-306,0,-425,-214,-425,-531v0,-364,142,-546,425,-546v179,0,286,128,326,253r-106,48v-26,-99,-92,-189,-220,-189v-195,0,-293,142,-293,425v0,240,83,420,293,428v122,4,210,-120,241,-207r104,50v-51,133,-158,269,-345,269","w":926,"k":{"X":36,"W":54,"V":84,"T":213,"S":18,"C":15,"G":15,"O":15,"Q":15,"U":12,"Y":197,"c":9,"e":9,"o":9,"q":9,"d":10,"g":8,"x":28}},"d":{"d":"874,-146v-1,35,14,124,26,146r-133,0v-17,-8,-25,-63,-25,-166v-90,170,-278,229,-450,132v-207,-117,-270,-482,-170,-749v53,-140,171,-274,336,-283v117,-6,251,86,284,149r0,-598r132,0r0,1369xm479,-101v142,0,190,-83,263,-177r0,-525v-71,-101,-150,-151,-237,-151v-199,0,-298,148,-298,444v0,217,69,409,272,409","w":984,"k":{"T":9,"B":11,"D":11,"E":11,"F":11,"H":11,"I":11,"K":11,"L":11,"M":11,"N":11,"P":11,"R":11,"U":9}},"e":{"d":"844,-229v-54,110,-212,240,-339,240v-237,0,-360,-136,-405,-322v-92,-380,44,-844,470,-743v206,49,271,251,271,541r-634,0v0,178,45,299,135,364v45,32,94,48,149,48v103,0,190,-64,262,-191xm709,-625v0,-168,-69,-325,-234,-329v-174,-4,-263,144,-262,329r496,0","w":925,"k":{"Z":17,"X":31,"W":74,"V":96,"T":181,"S":15,"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"U":14,"Y":154,"f":13,"t":14,"v":9,"x":24,"y":12,"z":8}},"f":{"d":"186,-1278v-6,-159,118,-246,284,-246v52,0,81,3,87,9r0,111r-89,0v-100,0,-150,42,-150,126r0,223r239,0r0,112r-239,0r0,943r-132,0r0,-943r-173,0r0,-112r173,0r0,-223","w":570,"k":{"J":84,"A":65,"Y":-27,"a":9,"c":28,"e":28,"o":28,"q":28,"d":34,"g":30}},"g":{"d":"326,-343v-27,20,-107,75,-96,111v-3,84,120,86,188,92v165,15,398,22,490,134v39,48,62,101,62,165v0,191,-160,286,-479,286v-169,0,-330,-45,-409,-147v-61,-78,-46,-199,20,-248v47,-35,112,-70,162,-97v-84,-14,-161,-69,-166,-139v-7,-106,103,-156,159,-195v-74,-64,-154,-179,-151,-315v4,-211,174,-370,378,-370v125,0,171,32,251,83v81,-70,130,-79,238,-85v-2,39,4,86,-2,120v-114,0,-171,10,-171,31v51,100,73,123,76,228v6,211,-157,384,-372,384v-58,0,-117,-13,-178,-38xm256,43v-117,61,-106,218,24,259v128,40,279,38,410,16v76,-13,154,-65,148,-152v-12,-187,-264,-159,-443,-182v-71,27,-117,47,-139,59xm504,-954v-153,0,-266,112,-266,265v0,154,103,272,260,272v157,0,246,-121,246,-271v0,-149,-86,-266,-240,-266","w":1005,"k":{"j":-80,"T":160,"J":37,"Y":52}},"h":{"d":"737,-786v5,-93,-84,-168,-169,-168v-99,0,-201,58,-307,173r0,781r-132,0r0,-1515r132,0r0,633v99,-94,179,-152,243,-170v202,-56,365,54,365,266r0,786r-132,0r0,-786","w":979,"k":{"B":13,"D":13,"E":13,"F":13,"H":13,"I":13,"K":13,"L":13,"M":13,"N":13,"P":13,"R":13,"S":10,"T":193,"U":19,"V":93,"W":68,"Y":153,"y":8}},"i":{"d":"120,-1188r0,-150r150,0r0,150r-150,0xm129,0r0,-1055r132,0r0,1055r-132,0","w":417,"k":{"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"T":40,"U":9,"Y":19,"Z":10}},"j":{"d":"111,-1188r0,-150r150,0r0,150r-150,0xm-63,225v145,-5,183,-35,183,-196r0,-1084r132,0r0,1055v-1,147,-18,218,-71,280v-44,51,-139,60,-236,57","w":362,"k":{"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"T":40,"U":9,"Y":19,"Z":10}},"k":{"d":"130,0r0,-1515r132,0r0,982r404,-522r158,0r-276,359r338,696r-146,0r-282,-582r-196,243r0,339r-132,0","w":911,"k":{"W":29,"V":42,"T":184,"S":20,"C":32,"G":32,"O":32,"Q":32,"U":22,"Y":119,"a":8,"c":34,"e":34,"o":34,"q":34,"d":33,"g":17,"s":10}},"l":{"d":"129,2r0,-1517r132,0r0,1517r-132,0","w":417,"k":{"T":9,"B":11,"D":11,"E":11,"F":11,"H":11,"I":11,"K":11,"L":11,"M":11,"N":11,"P":11,"R":11,"U":10}},"m":{"d":"728,-786v5,-93,-84,-168,-169,-168v-99,0,-201,58,-307,173r0,781r-132,0r0,-1055r132,0r0,174v92,-92,173,-149,243,-170v33,-10,74,-15,123,-15v115,0,214,81,233,193v97,-97,180,-156,249,-177v199,-59,367,51,367,264r0,786r-132,0r0,-786v5,-93,-84,-168,-169,-168v-98,0,-200,58,-306,173r0,781r-132,0r0,-786","w":1577,"k":{"B":13,"D":13,"E":13,"F":13,"H":13,"I":13,"K":13,"L":13,"M":13,"N":13,"P":13,"R":13,"S":10,"T":193,"U":19,"V":93,"W":68,"Y":153,"y":8}},"n":{"d":"728,-786v5,-93,-84,-168,-169,-168v-99,0,-201,58,-307,173r0,781r-132,0r0,-1055r132,0r0,173v106,-97,178,-184,353,-184v154,0,255,108,255,280r0,786r-132,0r0,-786","w":970,"k":{"B":13,"D":13,"E":13,"F":13,"H":13,"I":13,"K":13,"L":13,"M":13,"N":13,"P":13,"R":13,"S":10,"T":193,"U":19,"V":93,"W":68,"Y":153,"y":8}},"o":{"d":"75,-534v0,-296,134,-532,412,-532v278,0,410,239,410,536v0,297,-133,541,-410,542v-278,1,-412,-250,-412,-546xm487,-100v223,0,278,-198,278,-427v0,-285,-93,-427,-279,-427v-186,0,-279,142,-279,426v0,211,55,345,165,402v33,17,72,26,115,26","w":972,"k":{"A":14,"B":15,"D":15,"E":15,"F":15,"H":15,"I":15,"K":15,"L":15,"M":15,"N":15,"P":15,"R":15,"S":9,"T":191,"U":15,"V":104,"W":82,"X":58,"Y":181,"Z":39,"f":20,"t":21,"v":12,"w":10,"x":40,"y":15,"z":21}},"p":{"d":"544,11v-103,0,-254,-93,-283,-151r0,550r-132,0r0,-1465r132,0r0,164v44,-84,186,-175,296,-175v226,0,383,260,383,519v0,184,-45,330,-135,439v-65,79,-152,119,-261,119xm536,-954v-117,0,-215,84,-275,175r0,525v63,93,187,192,337,142v159,-53,209,-204,210,-435v0,-167,-39,-284,-116,-352v-41,-37,-93,-55,-156,-55","w":1015,"k":{"A":14,"B":15,"D":15,"E":15,"F":15,"H":15,"I":15,"K":15,"L":15,"M":15,"N":15,"P":15,"R":15,"S":9,"T":191,"U":15,"V":104,"W":82,"X":58,"Y":181,"Z":39,"f":20,"t":21,"v":12,"w":10,"x":40,"y":15,"z":21}},"q":{"d":"754,-140v-27,56,-181,155,-278,151v-249,-10,-345,-186,-387,-397v-45,-228,16,-447,125,-568v66,-74,147,-112,244,-112v109,0,236,79,296,175r17,-164r115,0r0,1465r-132,0r0,-550xm480,-954v-206,0,-272,185,-273,400v-2,248,64,453,284,453v104,0,192,-51,263,-153r0,-525v-75,-103,-138,-175,-274,-175","w":996,"k":{"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"T":189,"U":16,"V":67,"W":47,"Y":140,"Z":10}},"r":{"d":"252,-771v74,-177,161,-307,362,-293r0,112v-93,13,-142,29,-201,78v-50,41,-104,124,-161,247r0,627r-132,0r0,-1055r132,0r0,284","w":639,"k":{"Z":138,"X":100,"T":181,"J":175,"A":93,"Y":55,"a":13,"c":39,"e":39,"o":39,"q":39,"d":47,"g":38}},"s":{"d":"798,-292v0,174,-164,306,-335,303v-200,-3,-298,-78,-383,-211r99,-64v65,97,132,160,277,163v108,2,208,-59,210,-161v3,-239,-280,-201,-423,-291v-81,-51,-149,-124,-149,-243v0,-164,156,-270,332,-270v133,0,257,69,326,168r-91,68v-66,-68,-107,-124,-253,-124v-88,0,-184,63,-186,139v-5,171,192,186,306,228v88,32,186,73,231,147v27,45,39,95,39,148","w":878,"k":{"X":17,"W":67,"V":96,"T":181,"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"C":11,"G":11,"O":11,"Q":11,"U":15,"Y":148,"x":15}},"t":{"d":"460,13v-202,0,-246,-93,-246,-287r0,-669r-178,0r0,-112r178,0r0,-385r132,0r0,385r242,0r0,112r-242,0r0,669v1,122,24,171,133,175v20,1,97,-8,109,-11r0,99v-44,16,-86,24,-128,24","w":606,"k":{"V":9,"T":114,"Y":50,"c":8,"e":8,"o":8,"q":8,"d":10}},"u":{"d":"494,-4v-200,58,-365,-53,-365,-265r0,-786r132,0r0,786v-5,93,84,168,169,168v99,0,201,-58,307,-173r0,-781r132,0r0,1055r-132,0r0,-174v-95,93,-175,150,-243,170","w":979,"k":{"B":10,"D":10,"E":10,"F":10,"H":10,"I":10,"K":10,"L":10,"M":10,"N":10,"P":10,"R":10,"T":189,"U":16,"V":67,"W":47,"Y":140,"Z":10}},"v":{"d":"25,-1055r138,0r278,909r19,0r278,-909r138,0r-324,1055r-203,0","w":901,"k":{"Z":106,"X":87,"V":16,"T":165,"J":90,"A":56,"Y":78,"c":11,"e":11,"o":11,"q":11,"d":14,"g":15}},"w":{"d":"25,-1055r123,0r232,795r208,-795r120,0r226,800r222,-800r135,0r-301,1055r-118,0r-224,-809r-201,809r-135,0","w":1316,"k":{"Z":105,"X":85,"W":10,"V":18,"T":167,"J":78,"A":53,"Y":82,"c":10,"e":10,"o":10,"q":10,"d":12,"g":14}},"x":{"d":"25,0r330,-544r-320,-511r148,0r245,390r256,-390r148,0r-332,505r345,550r-148,0r-267,-425r-257,425r-148,0","w":870,"k":{"W":9,"V":19,"T":180,"S":20,"C":26,"G":26,"O":26,"Q":26,"Y":84,"a":18,"c":46,"e":46,"o":46,"q":46,"d":47,"g":29,"s":18}},"y":{"d":"274,378v-77,21,-163,18,-247,7r10,-121v45,23,148,22,195,2v102,-42,150,-146,172,-263r-379,-1058r142,0r299,859r280,-859r134,0r-368,1119v-38,114,-76,191,-114,232v-42,44,-83,72,-124,82","w":905,"k":{"Z":108,"X":91,"V":15,"T":165,"J":95,"A":61,"Y":76,"c":13,"e":13,"o":13,"q":13,"d":16,"g":16}},"z":{"d":"25,0r0,-85r560,-858r-507,0r0,-112r676,0r0,74r-568,861r568,0r0,120r-729,0","w":779,"k":{"W":18,"V":30,"T":174,"C":10,"G":10,"O":10,"Q":10,"U":15,"Y":102,"c":21,"e":21,"o":21,"q":21,"d":22,"g":8}},"\u00a0":{}}});
