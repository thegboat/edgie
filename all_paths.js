(function($) {

$.widget("ui.all_paths", {
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
    return {"1":"abbeville","2":"aiken","3":"allendale","4":"anderson","5":"bamberg","6":"barnwell","7":"beaufort","8":"berkeley","9":"calhoun","10":"charleston","11":"cherokee","12":"chester","13":"chesterfield","14":"clarendon","15":"colleton","16":"darlington","17":"dillon","18":"dorchester","19":"edgefield","20":"fairfield","21":"florence","22":"georgetown","23":"greenville","24":"greenwood","25":"hampton","26":"horry","27":"jasper","28":"kershaw","29":"lancaster","30":"laurens","31":"lee","32":"lexington","33":"malboro","34":"marion","35":"mccormick","36":"newberry","37":"oconee","38":"orangeburg","39":"pickens","40":"richland","41":"saluda","42":"spartanburg","43":"sumter","44":"union","45":"williamsburg","46":"york"}
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
    attrs = attrs || {fill: color, stroke: this.colors.edge, "stroke-width": 1, "stroke-linejoin": "round"};
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
        abbeville         : { name : 'abbeville'      , title : 'ABBEVILLE'      , text : [309,358]      , edges : ["1z"]},
        aiken             : { name : 'aiken'          , title : 'AIKEN'          , text : [483,525]      , edges : ["2z"]},
        allendale         : { name : 'allendale'      , title : 'ALLENDALE'      , text : [501,617]      , edges : ["3z"]},
        anderson          : { name : 'anderson'       , title : 'ANDERSON'       , text : [295,318]      , edges : ["4z"]},
        bamberg           : { name : 'bamberg'        , title : 'BAMBERG'        , text : [548,560]      , edges : ["5z"]},
        barnwell          : { name : 'barnwell'       , title : 'BARNWELL'       , text : [479,546]      , edges : ["6z"]},
        beaufort          : { name : 'beaufort'       , title : 'BEAUFORT'       , text : [610,751]      , edges : ["7z","8z","9z","10z","11z","12z","13z"]},
        berkeley          : { name : 'berkeley'       , title : 'BERKELEY'       , text : [778,601]      , edges : ["14z"]},
        calhoun           : { name : 'calhoun'        , title : 'CALHOUN'        , text : [599,470]      , edges : ["15z"]},
        charleston        : { name : 'charleston'     , title : 'CHARLESTON'     , text : [809,668]      , edges : ["16z"]},
        cherokee          : { name : 'cherokee'       , title : 'CHEROKEE'       , text : [453,192]      , edges : ["17z"]},
        chester           : { name : 'chester'        , title : 'CHESTER'        , text : [538,256]      , edges : ["18z"]},
        chesterfield      : { name : 'chesterfield'   , title : 'CHESTERFIELD'   , text : [719,288]      , edges : ["19z"]},
        clarendon         : { name : 'clarendon'      , title : 'CLARENDON'      , text : [704,479]      , edges : ["20z"]},
        colleton          : { name : 'colleton'       , title : 'COLLETON'       , text : [626,673]      , edges : ["21z"]},
        darlington        : { name : 'darlington'     , title : 'DARLINGTON'     , text : [740,345]      , edges : ["22z"]},
        dillon            : { name : 'dillon'         , title : 'DILLON'         , text : [838,312]      , edges : ["23z"]},
        dorchester        : { name : 'dorchester'     , title : 'DORCHESTER'     , text : [671,602]      , edges : ["24z"]},
        edgefield         : { name : 'edgefield'      , title : 'EDGEFIELD'      , text : [404,457]      , edges : ["25z"]},
        fairfield         : { name : 'fairfield'      , title : 'FAIRFIELD'      , text : [553,327]      , edges : ["26z"]},
        florence          : { name : 'florence'       , title : 'FLORENCE'       , text : [799,408]      , edges : ["27z"]},
        georgetown        : { name : 'georgetown'     , title : 'GEORGETOWN'     , text : [855,541]      , edges : ["28z"]},
        greenville        : { name : 'greenville'     , title : 'GREENVILLE'     , text : [324,263]      , edges : ["29z"]},
        greenwood         : { name : 'greenwood'      , title : 'GREENWOOD'      , text : [369,372]      , edges : ["30z"]},
        hampton           : { name : 'hampton'        , title : 'HAMPTON'        , text : [545,654]      , edges : ["31z"]},
        horry             : { name : 'horry'          , title : 'HORRY'          , text : [928,448]      , edges : ["32z"]},
        jasper            : { name : 'jasper'         , title : 'JASPER'         , text : [547,762]      , edges : ["33z"]},
        kershaw           : { name : 'kershaw'        , title : 'KERSHAW'        , text : [636,350]      , edges : ["34z"]},
        lancaster         : { name : 'lancaster'      , title : 'LANCASTER'      , text : [613,271]      , edges : ["35z"]},
        laurens           : { name : 'laurens'        , title : 'LAURENS'        , text : [407,321]      , edges : ["36z"]},
        lee               : { name : 'lee'            , title : 'LEE'            , text : [683,373]      , edges : ["37z"]},
        lexington         : { name : 'lexington'      , title : 'LEXINGTON'      , text : [527,433]      , edges : ["38z"]},
        malboro           : { name : 'malboro'        , title : 'MALBORO'        , text : [773,302]      , edges : ["39z"]},
        marion            : { name : 'marion'         , title : 'MARION'         , text : [835,422]      , edges : ["40z"]},
        mccormick         : { name : 'mccormick'      , title : 'MCCORMICK'      , text : [340,447]      , edges : ["41z"]},
        newberry          : { name : 'newberry'       , title : 'NEWBERRY'       , text : [461,349]      , edges : ["42z"]},
        oconee            : { name : 'oconee'         , title : 'OCONEE'         , text : [213,265]      , edges : ["43z"]},
        orangeburg        : { name : 'orangeburg'     , title : 'ORANGEBURG'     , text : [647,530]      , edges : ["44z"]},
        pickens           : { name : 'pickens'        , title : 'PICKENS'        , text : [268,232]      , edges : ["45z"]},
        richland          : { name : 'richland'       , title : 'RICHLAND'       , text : [589,416]      , edges : ["46z"]},
        saluda            : { name : 'saluda'         , title : 'SALUDA'         , text : [436,402]      , edges : ["47z"]},
        spartanburg       : { name : 'spartanburg'    , title : 'SPARTANBURG'    , text : [395,245]      , edges : ["48z"]},
        sumter            : { name : 'sumter'         , title : 'SUMTER'         , text : [700,434]      , edges : ["49z"]},
        union             : { name : 'union'          , title : 'UNION'          , text : [446,273]      , edges : ["50z"]},
        williamsburg      : { name : 'williamsburg'   , title : 'WILLIAMSBURG'   , text : [798,502]      , edges : ["51z"]},
        york              : { name : 'york'           , title : 'YORK'           , text : [538,198]      , edges : ["52z"]},
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
    return 806
  },

  _height : function(){
    return 643
  },

  _base_paths : function(){
    return {
        1         : [[274,283]      , [296,267]      , [306,279]      , [302,287]      , [293,290]      , [294,295]      , [294,296]      , [295,299]      , [295,300]      , [296,302]      , [296,305]      , [297,307]      , [298,309]      , [302,311]      , [305,316]      , [309,324]      , [307,336]      , [301,343]      , [293,351]      , [284,352]      , [274,350]      , [270,349]      , [269,347]      , [265,347]      , [256,348]      , [254,353]      , [248,358]      , [246,353]      , [244,351]      , [240,348]      , [240,338]      , [232,335]      , [229,332]      , [226,329]      , [226,323]      , [225,319]      , [274,283]      ],
        2         : [[429,402]      , [440,408]      , [446,418]      , [459,422]      , [483,434]      , [466,453]      , [457,463]      , [423,493]      , [387,525]      , [386,521]      , [379,523]      , [381,523]      , [372,516]      , [376,514]      , [370,506]      , [373,503]      , [367,503]      , [362,495]      , [359,495]      , [359,495]      , [357,492]      , [360,491]      , [359,483]      , [362,484]      , [359,480]      , [365,473]      , [352,469]      , [350,466]      , [348,464]      , [347,460]      , [346,457]      , [370,435]      , [397,410]      , [419,390]      , [429,402]      ],
        3         : [[417,542]      , [419,540]      , [422,536]      , [425,536]      , [427,535]      , [433,538]      , [435,538]      , [443,541]      , [451,545]      , [459,545]      , [481,543]      , [486,544]      , [490,551]      , [493,554]      , [497,557]      , [498,556]      , [501,561]      , [478,576]      , [474,584]      , [469,589]      , [471,599]      , [468,601]      , [464,605]      , [461,607]      , [455,613]      , [457,614]      , [447,617]      , [444,610]      , [445,603]      , [446,600]      , [439,596]      , [439,592]      , [438,592]      , [435,589]      , [437,585]      , [432,582]      , [430,574]      , [436,567]      , [430,557]      , [421,557]      , [421,553]      , [413,548]      , [414,545]      , [415,544]      , [417,542]      ],
        4         : [[202,244]      , [218,227]      , [245,211]      , [269,198]      , [270,199]      , [269,201]      , [275,205]      , [272,209]      , [271,214]      , [271,228]      , [272,235]      , [274,237]      , [277,243]      , [278,246]      , [278,248]      , [279,251]      , [280,252]      , [293,263]      , [295,264]      , [295,266]      , [246,303]      , [224,318]      , [224,315]      , [224,311]      , [223,308]      , [218,301]      , [215,293]      , [213,290]      , [211,290]      , [209,286]      , [207,280]      , [207,269]      , [201,265]      , [197,262]      , [190,263]      , [185,263]      , [202,244]      ],
        5         : [[484,483]      , [502,491]      , [509,497]      , [517,501]      , [534,514]      , [540,518]      , [543,524]      , [548,532]      , [545,534]      , [535,539]      , [534,542]      , [534,544]      , [535,546]      , [536,548]      , [532,554]      , [527,545]      , [523,547]      , [507,558]      , [504,559]      , [499,560]      , [491,550]      , [487,547]      , [484,543]      , [480,539]      , [479,534]      , [479,522]      , [479,511]      , [479,497]      , [481,494]      , [479,478]      , [484,483]      ],
        6         : [[479,496]      , [478,510]      , [478,523]      , [478,533]      , [479,538]      , [479,540]      , [479,541]      , [478,541]      , [477,542]      , [472,543]      , [471,543]      , [454,546]      , [452,542]      , [437,538]      , [435,537]      , [428,535]      , [426,535]      , [421,535]      , [416,543]      , [412,545]      , [411,546]      , [410,546]      , [408,546]      , [403,546]      , [391,538]      , [388,534]      , [383,527]      , [394,520]      , [399,516]      , [415,501]      , [437,482]      , [440,480]      , [450,470]      , [452,469]      , [454,468]      , [456,469]      , [458,469]      , [461,470]      , [463,470]      , [466,471]      , [471,474]      , [471,476]      , [478,478]      , [479,486]      , [479,488]      , [479,496]      ],
        7         : [[556,632]      , [560,633]      , [563,631]      , [566,635]      , [569,634]      , [574,640]      , [571,642]      , [573,644]      , [575,646]      , [579,651]      , [581,650]      , [587,651]      , [589,657]      , [593,655]      , [595,661]      , [600,668]      , [606,670]      , [605,675]      , [597,675]      , [591,673]      , [585,679]      , [590,678]      , [601,676]      , [606,679]      , [607,680]      , [609,684]      , [610,686]      , [602,690]      , [598,693]      , [593,697]      , [595,702]      , [591,702]      , [590,707]      , [589,710]      , [584,714]      , [583,715]      , [580,717]      , [579,715]      , [577,712]      , [579,707]      , [579,704]      , [579,700]      , [577,698]      , [574,695]      , [573,709]      , [566,707]      , [568,704]      , [564,699]      , [559,695]      , [556,691]      , [553,681]      , [550,676]      , [549,672]      , [545,666]      , [544,662]      , [543,655]      , [548,650]      , [542,644]      , [540,635]      , [544,627]      , [548,629]      , [552,631]      , [556,632]      ],
        8         : [[574,682]      , [571,683]      , [572,693]      , [573,688]      , [575,692]      , [574,682]      , [579,683]      , [574,678]      , [574,682]      ],
        9         : [[546,678]      , [548,685]      , [550,692]      , [555,698]      , [558,703]      , [561,703]      , [564,709]      , [553,705]      , [555,699]      , [545,693]      , [549,702]      , [550,698]      , [549,709]      , [540,705]      , [543,711]      , [550,714]      , [552,705]      , [556,707]      , [556,710]      , [559,713]      , [563,716]      , [569,715]      , [571,722]      , [572,726]      , [570,729]      , [568,732]      , [567,734]      , [564,738]      , [562,739]      , [559,742]      , [550,746]      , [546,746]      , [551,734]      , [558,733]      , [552,722]      , [552,727]      , [545,726]      , [543,724]      , [537,728]      , [543,728]      , [546,728]      , [551,732]      , [538,743]      , [544,740]      , [544,748]      , [542,751]      , [533,750]      , [534,745]      , [530,744]      , [532,740]      , [525,740]      , [525,737]      , [525,735]      , [523,732]      , [520,729]      , [516,729]      , [515,723]      , [514,719]      , [516,717]      , [517,714]      , [518,712]      , [517,709]      , [516,707]      , [528,708]      , [528,695]      , [532,698]      , [538,699]      , [546,684]      , [542,684]      , [544,678]      , [546,678]      ],
        10        : [[570,693]      , [571,694]      , [571,693]      , [570,693]      ],
        11        : [[569,694]      , [570,695]      , [570,694]      , [569,694]      ],
        12        : [[570,695]      , [571,696]      , [571,695]      , [570,695]      ],
        13        : [[572,696]      , [573,697]      , [573,696]      , [572,696]      ],
        14        : [[674,464]      , [677,464]      , [690,465]      , [692,467]      , [704,476]      , [709,483]      , [712,488]      , [721,490]      , [727,498]      , [744,505]      , [758,510]      , [760,513]      , [778,519]      , [774,525]      , [771,523]      , [767,535]      , [761,533]      , [759,532]      , [754,537]      , [746,537]      , [745,543]      , [741,549]      , [727,567]      , [725,570]      , [726,572]      , [725,575]      , [723,578]      , [716,580]      , [713,581]      , [713,584]      , [713,587]      , [710,589]      , [709,591]      , [706,592]      , [705,593]      , [702,597]      , [706,599]      , [699,601]      , [698,591]      , [689,594]      , [696,584]      , [685,584]      , [681,583]      , [681,574]      , [680,570]      , [679,568]      , [678,567]      , [677,565]      , [669,567]      , [659,560]      , [644,546]      , [642,544]      , [636,540]      , [635,537]      , [633,534]      , [635,532]      , [635,530]      , [634,528]      , [632,526]      , [631,525]      , [628,521]      , [625,515]      , [626,510]      , [628,511]      , [630,512]      , [632,512]      , [634,512]      , [635,511]      , [637,510]      , [645,505]      , [643,499]      , [645,491]      , [647,485]      , [648,490]      , [648,477]      , [655,476]      , [664,477]      , [660,468]      , [664,465]      , [670,466]      , [669,465]      , [674,464]      ],
        15        : [[509,405]      , [511,395]      , [508,392]      , [515,389]      , [516,390]      , [515,393]      , [529,400]      , [531,404]      , [533,403]      , [537,402]      , [545,411]      , [548,411]      , [550,410]      , [552,413]      , [557,411]      , [563,416]      , [570,412]      , [574,414]      , [577,415]      , [579,420]      , [581,423]      , [584,427]      , [591,434]      , [595,437]      , [594,441]      , [596,444]      , [599,447]      , [599,456]      , [589,451]      , [592,452]      , [581,454]      , [581,456]      , [584,457]      , [582,463]      , [579,464]      , [580,470]      , [569,470]      , [571,466]      , [566,459]      , [564,457]      , [554,448]      , [551,446]      , [547,444]      , [540,441]      , [536,442]      , [527,443]      , [526,436]      , [521,439]      , [510,423]      , [529,415]      , [526,411]      , [520,407]      , [514,409]      , [513,410]      , [510,413]      , [509,415]      , [507,415]      , [506,410]      , [508,410]      , [509,405]      ],
        16        : [[727,568]      , [742,549]      , [744,546]      , [746,541]      , [749,539]      , [760,535]      , [763,534]      , [765,536]      , [767,535]      , [770,533]      , [772,522]      , [780,523]      , [783,523]      , [789,529]      , [793,532]      , [798,535]      , [803,535]      , [809,536]      , [808,544]      , [802,544]      , [797,549]      , [794,552]      , [796,554]      , [794,557]      , [792,559]      , [786,561]      , [783,561]      , [782,557]      , [782,557]      , [779,555]      , [777,562]      , [775,562]      , [772,558]      , [772,557]      , [767,556]      , [765,560]      , [764,559]      , [761,562]      , [759,563]      , [758,566]      , [757,568]      , [752,574]      , [750,580]      , [761,579]      , [759,585]      , [751,588]      , [746,591]      , [736,598]      , [739,600]      , [734,604]      , [722,610]      , [719,612]      , [712,617]      , [710,620]      , [709,623]      , [708,628]      , [705,631]      , [695,638]      , [693,640]      , [690,643]      , [688,644]      , [684,646]      , [681,644]      , [672,647]      , [669,648]      , [660,653]      , [658,653]      , [654,653]      , [651,648]      , [648,645]      , [646,643]      , [645,644]      , [643,641]      , [640,642]      , [654,653]      , [653,656]      , [652,659]      , [649,660]      , [644,662]      , [641,658]      , [635,664]      , [627,661]      , [631,668]      , [616,658]      , [621,652]      , [621,650]      , [620,642]      , [615,645]      , [614,642]      , [618,641]      , [619,639]      , [621,635]      , [614,634]      , [617,631]      , [615,626]      , [614,623]      , [612,622]      , [610,620]      , [612,606]      , [620,607]      , [619,595]      , [635,597]      , [662,603]      , [657,595]      , [665,587]      , [671,589]      , [672,581]      , [664,570]      , [667,569]      , [673,566]      , [676,568]      , [680,570]      , [679,582]      , [684,585]      , [686,586]      , [691,585]      , [693,585]      , [690,598]      , [698,591]      , [698,602]      , [704,601]      , [705,600]      , [704,594]      , [711,591]      , [713,590]      , [714,582]      , [725,578]      , [727,568]      ],
        17        : [[386,126]      , [406,127]      , [422,128]      , [453,129]      , [448,142]      , [448,138]      , [448,152]      , [445,152]      , [440,151]      , [438,153]      , [433,156]      , [436,162]      , [435,167]      , [435,172]      , [435,173]      , [438,186]      , [437,192]      , [434,188]      , [431,186]      , [426,188]      , [419,185]      , [414,185]      , [412,190]      , [408,181]      , [400,181]      , [397,179]      , [391,175]      , [390,172]      , [387,166]      , [388,158]      , [382,154]      , [383,146]      , [374,134]      , [372,125]      , [386,126]      ],
        18        : [[533,199]      , [538,212]      , [535,206]      , [536,216]      , [537,219]      , [538,221]      , [538,224]      , [537,227]      , [534,229]      , [534,234]      , [532,240]      , [535,247]      , [537,253]      , [527,256]      , [515,253]      , [505,252]      , [445,248]      , [446,245]      , [447,240]      , [446,237]      , [445,234]      , [443,232]      , [441,228]      , [440,223]      , [443,218]      , [436,218]      , [436,212]      , [439,214]      , [440,210]      , [442,206]      , [438,202]      , [436,199]      , [533,199]      ],
        19        : [[649,200]      , [665,201]      , [693,201]      , [694,210]      , [697,209]      , [701,215]      , [703,219]      , [703,223]      , [706,227]      , [709,230]      , [713,231]      , [715,233]      , [717,234]      , [718,238]      , [719,240]      , [711,243]      , [716,248]      , [710,255]      , [708,257]      , [704,262]      , [702,263]      , [689,265]      , [686,263]      , [673,266]      , [636,288]      , [634,282]      , [631,280]      , [630,275]      , [629,264]      , [628,260]      , [625,259]      , [622,254]      , [620,249]      , [620,242]      , [611,235]      , [611,229]      , [608,229]      , [604,224]      , [597,211]      , [594,206]      , [592,206]      , [590,200]      , [649,200]      ],
        20        : [[638,407]      , [651,397]      , [667,388]      , [674,384]      , [681,378]      , [689,376]      , [692,387]      , [704,387]      , [698,399]      , [686,409]      , [687,420]      , [681,434]      , [673,452]      , [668,462]      , [659,467]      , [660,472]      , [659,473]      , [657,472]      , [653,477]      , [647,473]      , [640,477]      , [635,475]      , [632,479]      , [627,478]      , [622,478]      , [614,473]      , [613,469]      , [612,467]      , [612,466]      , [612,464]      , [607,461]      , [610,459]      , [610,458]      , [609,455]      , [604,455]      , [601,453]      , [598,449]      , [601,446]      , [597,445]      , [596,437]      , [600,431]      , [604,422]      , [609,423]      , [609,420]      , [609,419]      , [612,418]      , [611,423]      , [619,422]      , [618,411]      , [621,411]      , [635,409]      , [638,407]      ],
        21        : [[561,533]      , [567,536]      , [569,541]      , [572,546]      , [579,554]      , [586,557]      , [596,553]      , [606,555]      , [611,556]      , [619,557]      , [618,561]      , [615,566]      , [615,571]      , [615,575]      , [617,577]      , [618,580]      , [618,600]      , [617,606]      , [606,614]      , [611,622]      , [612,623]      , [614,625]      , [615,626]      , [615,632]      , [614,633]      , [619,637]      , [617,640]      , [617,640]      , [613,641]      , [615,647]      , [620,644]      , [620,653]      , [615,659]      , [621,660]      , [623,662]      , [626,668]      , [618,673]      , [611,664]      , [609,670]      , [603,665]      , [595,658]      , [605,651]      , [595,649]      , [595,654]      , [588,653]      , [589,650]      , [588,649]      , [580,650]      , [574,643]      , [576,646]      , [574,637]      , [571,638]      , [570,635]      , [573,632]      , [564,633]      , [567,632]      , [563,631]      , [558,631]      , [554,630]      , [548,628]      , [545,624]      , [532,599]      , [529,593]      , [523,591]      , [519,586]      , [513,574]      , [503,561]      , [527,547]      , [531,555]      , [534,555]      , [537,545]      , [536,551]      , [535,541]      , [543,536]      , [551,529]      , [561,533]      ],
        22        : [[715,266]      , [719,266]      , [723,263]      , [722,261]      , [723,260]      , [729,264]      , [724,268]      , [729,284]      , [735,282]      , [737,289]      , [734,290]      , [739,298]      , [740,297]      , [737,305]      , [728,303]      , [725,313]      , [714,311]      , [714,314]      , [705,321]      , [686,335]      , [681,340]      , [677,344]      , [670,345]      , [666,340]      , [660,337]      , [660,332]      , [660,329]      , [663,327]      , [664,324]      , [665,321]      , [665,319]      , [664,316]      , [662,306]      , [659,306]      , [657,301]      , [655,298]      , [654,293]      , [654,289]      , [648,292]      , [647,300]      , [639,294]      , [638,292]      , [637,291]      , [636,290]      , [659,275]      , [674,266]      , [687,263]      , [688,266]      , [703,264]      , [710,256]      , [715,266]      ],
        23        : [[802,265]      , [838,300]      , [831,309]      , [829,308]      , [824,305]      , [822,305]      , [819,305]      , [816,310]      , [810,309]      , [804,307]      , [801,306]      , [800,307]      , [796,305]      , [791,303]      , [789,300]      , [783,301]      , [781,302]      , [773,304]      , [771,305]      , [768,307]      , [765,312]      , [760,311]      , [756,311]      , [755,306]      , [746,302]      , [774,239]      , [783,243]      , [795,257]      , [802,265]      ],
        24        : [[583,510]      , [601,500]      , [601,508]      , [605,513]      , [613,514]      , [616,514]      , [621,512]      , [625,516]      , [627,518]      , [628,522]      , [629,525]      , [631,527]      , [633,528]      , [633,530]      , [634,533]      , [631,534]      , [634,538]      , [639,544]      , [654,553]      , [658,562]      , [655,563]      , [671,580]      , [670,587]      , [665,585]      , [659,593]      , [655,591]      , [659,602]      , [634,595]      , [618,593]      , [621,585]      , [616,575]      , [616,571]      , [617,565]      , [620,561]      , [619,555]      , [612,556]      , [612,554]      , [607,553]      , [610,554]      , [591,553]      , [594,552]      , [590,553]      , [587,555]      , [581,552]      , [572,547]      , [571,540]      , [565,534]      , [561,531]      , [557,531]      , [553,530]      , [583,510]      ],
        25        : [[365,369]      , [366,373]      , [368,384]      , [371,387]      , [376,393]      , [396,399]      , [404,401]      , [402,406]      , [394,412]      , [390,416]      , [363,441]      , [358,446]      , [349,455]      , [343,457]      , [337,448]      , [333,449]      , [331,446]      , [328,442]      , [333,439]      , [329,434]      , [324,428]      , [319,426]      , [317,418]      , [321,414]      , [319,404]      , [329,399]      , [323,388]      , [322,378]      , [333,375]      , [354,369]      , [365,369]      ],
        26        : [[462,250]      , [491,252]      , [536,255]      , [536,260]      , [536,262]      , [532,265]      , [534,270]      , [538,276]      , [543,280]      , [547,283]      , [552,280]      , [553,288]      , [553,292]      , [549,300]      , [547,304]      , [547,306]      , [546,308]      , [544,309]      , [542,310]      , [530,312]      , [527,312]      , [506,317]      , [502,319]      , [502,321]      , [496,320]      , [492,320]      , [489,320]      , [485,319]      , [485,321]      , [487,324]      , [485,325]      , [483,327]      , [480,324]      , [479,323]      , [474,322]      , [479,324]      , [460,312]      , [464,315]      , [463,314]      , [462,314]      , [462,313]      , [459,309]      , [460,307]      , [458,304]      , [455,298]      , [455,297]      , [453,291]      , [446,274]      , [445,268]      , [446,249]      , [462,250]      ],
        27        : [[757,312]      , [758,314]      , [759,316]      , [759,318]      , [760,322]      , [756,323]      , [756,326]      , [756,329]      , [762,334]      , [763,339]      , [764,342]      , [762,344]      , [763,347]      , [765,355]      , [767,362]      , [764,363]      , [770,369]      , [770,378]      , [780,382]      , [786,388]      , [790,392]      , [789,395]      , [796,395]      , [799,401]      , [788,398]      , [786,402]      , [785,402]      , [781,403]      , [771,408]      , [767,407]      , [757,404]      , [753,403]      , [748,403]      , [746,399]      , [732,403]      , [732,399]      , [726,397]      , [724,396]      , [721,396]      , [719,395]      , [715,392]      , [714,386]      , [707,386]      , [693,386]      , [692,384]      , [690,378]      , [690,376]      , [691,373]      , [700,368]      , [703,365]      , [694,358]      , [693,360]      , [688,356]      , [680,351]      , [683,350]      , [673,346]      , [703,323]      , [716,314]      , [726,314]      , [729,304]      , [734,305]      , [736,307]      , [739,302]      , [748,303]      , [752,304]      , [757,312]      ],
        28        : [[760,510]      , [748,506]      , [745,504]      , [740,504]      , [741,499]      , [742,495]      , [746,491]      , [749,488]      , [754,480]      , [756,473]      , [763,466]      , [765,463]      , [767,463]      , [770,460]      , [779,450]      , [781,447]      , [780,445]      , [781,439]      , [786,423]      , [783,429]      , [793,415]      , [796,411]      , [796,410]      , [800,407]      , [803,413]      , [805,423]      , [814,423]      , [823,422]      , [826,426]      , [827,426]      , [827,431]      , [831,431]      , [834,443]      , [837,441]      , [836,448]      , [855,448]      , [846,462]      , [841,468]      , [836,479]      , [831,490]      , [826,511]      , [827,521]      , [825,517]      , [824,514]      , [824,510]      , [824,507]      , [824,504]      , [822,502]      , [820,501]      , [815,501]      , [812,501]      , [816,489]      , [809,489]      , [809,493]      , [807,502]      , [808,504]      , [811,510]      , [820,513]      , [822,516]      , [823,518]      , [822,523]      , [822,526]      , [826,526]      , [824,532]      , [816,539]      , [810,541]      , [810,538]      , [810,537]      , [808,535]      , [805,534]      , [800,534]      , [795,532]      , [789,529]      , [785,522]      , [779,521]      , [778,516]      , [775,514]      , [768,518]      , [765,513]      , [760,510]      ],
        29        : [[288,123]      , [291,125]      , [300,122]      , [304,121]      , [314,122]      , [313,144]      , [313,159]      , [312,180]      , [312,183]      , [311,189]      , [312,191]      , [313,193]      , [324,201]      , [322,209]      , [310,241]      , [308,247]      , [310,251]      , [308,255]      , [307,257]      , [300,263]      , [297,263]      , [294,263]      , [288,258]      , [286,256]      , [280,250]      , [279,249]      , [279,246]      , [278,244]      , [276,238]      , [275,239]      , [273,230]      , [272,220]      , [273,218]      , [272,216]      , [273,214]      , [275,201]      , [273,208]      , [271,197]      , [267,180]      , [264,173]      , [260,165]      , [261,157]      , [252,158]      , [251,149]      , [256,146]      , [249,144]      , [250,146]      , [244,147]      , [235,148]      , [236,145]      , [226,150]      , [224,148]      , [224,147]      , [229,143]      , [234,139]      , [235,141]      , [237,135]      , [240,136]      , [256,131]      , [259,128]      , [265,130]      , [267,127]      , [272,126]      , [274,126]      , [276,128]      , [278,126]      , [280,125]      , [279,123]      , [285,119]      , [286,120]      , [287,122]      , [288,123]      ],
        30        : [[295,350]      , [296,347]      , [300,345]      , [302,343]      , [307,337]      , [308,332]      , [308,325]      , [307,314]      , [300,311]      , [298,307]      , [297,304]      , [297,303]      , [296,300]      , [296,298]      , [295,296]      , [295,294]      , [296,289]      , [305,283]      , [309,282]      , [312,287]      , [314,287]      , [317,290]      , [321,296]      , [324,299]      , [325,297]      , [327,303]      , [334,302]      , [336,306]      , [341,310]      , [348,316]      , [347,314]      , [351,317]      , [355,320]      , [356,322]      , [361,325]      , [363,331]      , [365,333]      , [369,338]      , [361,346]      , [361,348]      , [356,356]      , [350,363]      , [346,368]      , [347,370]      , [340,372]      , [341,366]      , [333,368]      , [334,366]      , [327,366]      , [320,366]      , [314,372]      , [308,359]      , [296,367]      , [296,363]      , [293,354]      , [295,350]      ],
        31        : [[477,580]      , [478,576]      , [489,569]      , [493,567]      , [496,565]      , [500,562]      , [504,564]      , [505,565]      , [506,568]      , [507,569]      , [515,579]      , [515,583]      , [518,587]      , [523,592]      , [529,594]      , [532,600]      , [536,606]      , [540,620]      , [545,625]      , [533,642]      , [523,638]      , [524,636]      , [525,633]      , [525,631]      , [525,629]      , [517,616]      , [511,619]      , [509,620]      , [501,627]      , [499,629]      , [479,645]      , [475,649]      , [471,654]      , [465,654]      , [463,654]      , [461,654]      , [459,654]      , [456,653]      , [448,646]      , [447,643]      , [447,640]      , [448,639]      , [448,636]      , [449,632]      , [447,629]      , [444,626]      , [447,622]      , [445,622]      , [449,616]      , [452,617]      , [457,614]      , [459,612]      , [460,610]      , [462,608]      , [464,605]      , [468,602]      , [470,600]      , [473,594]      , [466,588]      , [476,586]      , [476,584]      , [476,582]      , [477,580]      ],
        32        : [[859,321]      , [893,354]      , [903,364]      , [920,378]      , [928,389]      , [918,393]      , [902,399]      , [902,399]      , [889,410]      , [880,417]      , [873,424]      , [869,429]      , [863,437]      , [861,439]      , [858,445]      , [856,446]      , [853,448]      , [841,447]      , [837,447]      , [837,439]      , [835,441]      , [834,441]      , [833,436]      , [833,431]      , [828,430]      , [829,426]      , [821,420]      , [820,410]      , [808,408]      , [812,395]      , [809,394]      , [810,391]      , [810,387]      , [808,384]      , [805,380]      , [801,382]      , [802,375]      , [800,375]      , [797,367]      , [802,356]      , [805,355]      , [809,353]      , [810,350]      , [813,345]      , [809,344]      , [816,340]      , [817,329]      , [821,328]      , [826,320]      , [828,321]      , [832,309]      , [839,301]      , [859,321]      ],
        33        : [[476,649]      , [500,629]      , [502,627]      , [510,619]      , [513,619]      , [517,619]      , [522,627]      , [525,630]      , [525,631]      , [523,636]      , [523,637]      , [524,640]      , [531,642]      , [534,643]      , [537,637]      , [539,637]      , [544,649]      , [543,661]      , [547,674]      , [543,678]      , [542,680]      , [541,686]      , [544,685]      , [537,698]      , [528,695]      , [527,699]      , [527,707]      , [514,706]      , [515,709]      , [516,711]      , [516,714]      , [515,717]      , [513,719]      , [514,723]      , [515,731]      , [521,730]      , [524,738]      , [521,737]      , [522,740]      , [522,743]      , [526,741]      , [529,742]      , [528,745]      , [533,746]      , [532,751]      , [532,752]      , [536,755]      , [532,760]      , [535,762]      , [528,761]      , [529,759]      , [524,755]      , [520,752]      , [517,750]      , [514,749]      , [512,751]      , [508,751]      , [505,750]      , [500,746]      , [496,744]      , [495,734]      , [498,734]      , [497,728]      , [494,726]      , [490,722]      , [491,718]      , [492,716]      , [494,713]      , [495,710]      , [495,708]      , [495,706]      , [494,704]      , [493,697]      , [491,699]      , [488,695]      , [482,684]      , [480,679]      , [484,678]      , [482,674]      , [480,670]      , [477,671]      , [477,664]      , [465,660]      , [469,656]      , [476,649]      ],
        34        : [[608,244]      , [610,243]      , [613,241]      , [616,243]      , [620,245]      , [619,250]      , [622,255]      , [624,258]      , [626,261]      , [627,264]      , [629,276]      , [634,286]      , [636,293]      , [626,295]      , [622,295]      , [624,302]      , [620,302]      , [612,303]      , [611,308]      , [611,314]      , [611,324]      , [602,331]      , [595,337]      , [593,338]      , [589,342]      , [587,342]      , [584,343]      , [583,343]      , [581,343]      , [576,344]      , [568,350]      , [562,348]      , [560,347]      , [556,343]      , [554,341]      , [539,328]      , [540,323]      , [547,306]      , [550,300]      , [552,296]      , [555,291]      , [553,286]      , [551,279]      , [547,281]      , [544,279]      , [541,277]      , [539,275]      , [538,271]      , [559,257]      , [559,259]      , [558,267]      , [561,267]      , [563,267]      , [564,265]      , [565,264]      , [566,261]      , [568,261]      , [570,265]      , [571,267]      , [576,266]      , [580,267]      , [582,265]      , [585,264]      , [586,267]      , [596,263]      , [592,251]      , [608,244]      ],
        35        : [[546,167]      , [551,175]      , [549,199]      , [563,199]      , [580,200]      , [582,200]      , [585,200]      , [587,201]      , [592,203]      , [599,216]      , [602,222]      , [613,237]      , [613,240]      , [597,248]      , [592,252]      , [595,261]      , [589,264]      , [589,266]      , [583,262]      , [583,264]      , [578,263]      , [578,264]      , [573,267]      , [571,264]      , [565,258]      , [566,263]      , [560,267]      , [559,266]      , [560,255]      , [554,258]      , [548,263]      , [543,267]      , [541,268]      , [539,271]      , [536,270]      , [534,269]      , [534,266]      , [535,265]      , [540,251]      , [536,252]      , [535,240]      , [534,236]      , [534,234]      , [535,231]      , [537,227]      , [539,226]      , [539,221]      , [537,214]      , [537,206]      , [536,204]      , [534,201]      , [535,199]      , [535,197]      , [537,196]      , [538,193]      , [537,186]      , [537,182]      , [539,181]      , [538,176]      , [538,169]      , [536,169]      , [534,163]      , [533,160]      , [533,154]      , [533,151]      , [546,167]      ],
        36        : [[338,219]      , [340,228]      , [350,229]      , [356,233]      , [360,236]      , [361,239]      , [363,242]      , [372,247]      , [376,243]      , [377,246]      , [382,247]      , [382,249]      , [387,249]      , [388,250]      , [392,251]      , [396,253]      , [404,252]      , [406,256]      , [407,260]      , [400,270]      , [397,272]      , [389,279]      , [388,286]      , [383,290]      , [382,291]      , [371,298]      , [368,301]      , [362,307]      , [366,313]      , [357,321]      , [351,316]      , [345,312]      , [335,303]      , [322,295]      , [318,290]      , [310,282]      , [298,267]      , [309,254]      , [311,241]      , [324,206]      , [338,219]      ],
        37        : [[661,307]      , [662,312]      , [665,317]      , [664,322]      , [662,327]      , [657,329]      , [658,333]      , [660,337]      , [669,345]      , [673,347]      , [676,349]      , [680,350]      , [682,352]      , [683,355]      , [681,359]      , [679,361]      , [676,362]      , [674,362]      , [670,364]      , [654,373]      , [653,362]      , [642,365]      , [640,356]      , [638,358]      , [635,354]      , [633,352]      , [633,349]      , [629,348]      , [623,345]      , [603,349]      , [604,334]      , [605,328]      , [609,325]      , [611,320]      , [613,315]      , [611,310]      , [613,307]      , [614,304]      , [622,303]      , [625,303]      , [623,296]      , [632,296]      , [636,288]      , [642,299]      , [648,296]      , [649,296]      , [652,290]      , [656,298]      , [651,300]      , [661,307]      ],
        38        : [[445,336]      , [446,331]      , [449,330]      , [453,328]      , [455,327]      , [457,326]      , [459,326]      , [462,327]      , [464,330]      , [465,332]      , [462,336]      , [466,342]      , [470,344]      , [472,344]      , [479,344]      , [485,346]      , [493,350]      , [494,354]      , [499,360]      , [501,363]      , [504,363]      , [506,365]      , [507,367]      , [511,376]      , [511,378]      , [511,380]      , [511,380]      , [510,382]      , [514,384]      , [506,397]      , [511,391]      , [508,404]      , [506,412]      , [506,413]      , [506,414]      , [507,415]      , [510,416]      , [513,411]      , [514,409]      , [527,412]      , [527,414]      , [498,427]      , [495,429]      , [487,433]      , [484,433]      , [480,433]      , [476,430]      , [473,428]      , [458,420]      , [453,419]      , [449,419]      , [447,417]      , [444,415]      , [445,412]      , [440,407]      , [432,400]      , [433,406]      , [424,394]      , [423,393]      , [421,391]      , [421,389]      , [421,386]      , [424,380]      , [425,377]      , [438,348]      , [445,348]      , [448,350]      , [448,350]      , [451,350]      , [448,343]      , [443,341]      , [445,336]      ],
        39        : [[731,201]      , [733,201]      , [735,201]      , [737,202]      , [756,220]      , [760,223]      , [772,233]      , [773,238]      , [773,241]      , [767,254]      , [765,257]      , [750,290]      , [745,302]      , [739,299]      , [736,293]      , [739,287]      , [736,286]      , [737,282]      , [731,281]      , [725,269]      , [729,270]      , [729,261]      , [728,265]      , [724,258]      , [722,258]      , [720,262]      , [719,262]      , [715,264]      , [709,255]      , [715,252]      , [715,242]      , [721,240]      , [718,232]      , [714,231]      , [709,229]      , [706,225]      , [701,214]      , [697,208]      , [695,210]      , [694,201]      , [731,201]      ],
        40        : [[784,302]      , [790,302]      , [793,305]      , [797,307]      , [804,308]      , [811,310]      , [806,309]      , [816,311]      , [821,304]      , [823,305]      , [824,305]      , [825,307]      , [835,315]      , [820,323]      , [817,330]      , [817,332]      , [817,333]      , [817,335]      , [809,343]      , [813,355]      , [802,350]      , [800,361]      , [793,365]      , [796,369]      , [799,374]      , [801,379]      , [801,382]      , [807,383]      , [810,395]      , [809,402]      , [810,405]      , [814,411]      , [816,413]      , [820,417]      , [819,419]      , [817,422]      , [812,421]      , [809,421]      , [809,418]      , [805,418]      , [801,405]      , [799,397]      , [791,393]      , [785,386]      , [786,383]      , [777,380]      , [770,372]      , [772,370]      , [772,369]      , [766,365]      , [767,364]      , [767,358]      , [763,344]      , [766,342]      , [765,340]      , [766,336]      , [763,337]      , [757,326]      , [760,320]      , [759,313]      , [769,311]      , [771,303]      , [784,302]      ],
        41        : [[251,365]      , [250,363]      , [250,362]      , [250,360]      , [251,356]      , [256,350]      , [260,349]      , [269,346]      , [268,350]      , [275,351]      , [285,353]      , [284,351]      , [293,351]      , [296,369]      , [308,361]      , [315,373]      , [320,367]      , [328,367]      , [340,368]      , [339,373]      , [321,377]      , [321,380]      , [322,381]      , [320,383]      , [327,398]      , [323,400]      , [323,405]      , [320,406]      , [319,410]      , [318,416]      , [317,417]      , [317,418]      , [317,420]      , [317,429]      , [334,434]      , [328,443]      , [324,447]      , [316,440]      , [315,437]      , [314,435]      , [314,433]      , [313,430]      , [309,423]      , [308,420]      , [307,416]      , [305,413]      , [299,407]      , [295,402]      , [293,398]      , [286,394]      , [282,392]      , [278,389]      , [277,390]      , [273,387]      , [263,380]      , [264,374]      , [255,374]      , [251,365]      ],
        42        : [[421,267]      , [423,269]      , [423,272]      , [424,273]      , [426,274]      , [429,271]      , [430,270]      , [437,265]      , [437,266]      , [445,265]      , [446,275]      , [454,299]      , [456,303]      , [461,313]      , [461,316]      , [461,318]      , [460,320]      , [459,321]      , [455,328]      , [451,327]      , [448,329]      , [446,331]      , [443,336]      , [443,339]      , [450,349]      , [445,348]      , [441,346]      , [437,348]      , [435,348]      , [432,348]      , [430,348]      , [423,346]      , [411,336]      , [404,332]      , [398,328]      , [393,324]      , [386,330]      , [380,328]      , [368,324]      , [369,335]      , [365,332]      , [365,332]      , [365,327]      , [358,323]      , [364,313]      , [367,303]      , [377,295]      , [384,291]      , [393,277]      , [398,272]      , [408,258]      , [413,259]      , [418,263]      , [421,267]      ],
        43        : [[194,162]      , [198,172]      , [198,186]      , [199,200]      , [203,203]      , [200,209]      , [199,213]      , [206,215]      , [203,226]      , [213,230]      , [204,236]      , [204,243]      , [200,245]      , [196,249]      , [182,265]      , [173,262]      , [173,260]      , [167,254]      , [159,246]      , [154,240]      , [155,240]      , [156,238]      , [153,238]      , [148,237]      , [145,236]      , [143,235]      , [134,228]      , [132,226]      , [130,224]      , [127,222]      , [125,219]      , [122,212]      , [127,211]      , [129,207]      , [131,203]      , [129,196]      , [138,196]      , [138,190]      , [142,190]      , [145,183]      , [150,183]      , [151,180]      , [154,177]      , [158,174]      , [161,174]      , [165,172]      , [163,169]      , [167,159]      , [198,149]      , [194,162]      ],
        44        : [[461,459]      , [475,444]      , [483,436]      , [488,432]      , [503,426]      , [509,424]      , [522,441]      , [526,438]      , [526,441]      , [526,444]      , [530,444]      , [532,444]      , [534,442]      , [538,443]      , [548,443]      , [554,449]      , [561,456]      , [571,464]      , [568,472]      , [580,471]      , [581,473]      , [582,473]      , [582,471]      , [581,467]      , [581,465]      , [583,459]      , [586,462]      , [584,454]      , [593,453]      , [593,453]      , [600,459]      , [601,453]      , [603,456]      , [609,457]      , [606,459]      , [607,464]      , [608,463]      , [610,466]      , [617,477]      , [624,484]      , [637,476]      , [644,476]      , [644,478]      , [647,477]      , [647,486]      , [644,486]      , [644,494]      , [644,505]      , [636,510]      , [630,514]      , [628,507]      , [624,513]      , [617,512]      , [607,515]      , [603,507]      , [602,505]      , [602,500]      , [601,498]      , [566,520]      , [549,530]      , [544,525]      , [542,518]      , [525,504]      , [507,494]      , [502,490]      , [496,488]      , [485,483]      , [480,478]      , [473,475]      , [465,470]      , [454,467]      , [461,459]      ],
        45        : [[220,143]      , [219,147]      , [229,150]      , [235,148]      , [244,148]      , [254,147]      , [251,149]      , [250,150]      , [252,153]      , [250,159]      , [259,158]      , [258,166]      , [262,169]      , [261,171]      , [263,175]      , [265,182]      , [268,183]      , [268,192]      , [268,193]      , [268,195]      , [267,196]      , [266,199]      , [256,204]      , [253,205]      , [218,226]      , [211,232]      , [211,228]      , [210,228]      , [207,226]      , [208,220]      , [206,220]      , [207,214]      , [206,213]      , [200,212]      , [204,201]      , [196,195]      , [202,177]      , [198,171]      , [198,164]      , [194,163]      , [195,160]      , [196,160]      , [199,158]      , [198,152]      , [204,147]      , [212,145]      , [220,143]      ],
        46        : [[499,321]      , [518,315]      , [544,311]      , [537,328]      , [544,331]      , [544,333]      , [549,338]      , [554,342]      , [559,345]      , [562,351]      , [577,346]      , [577,351]      , [589,358]      , [571,361]      , [578,369]      , [577,372]      , [579,372]      , [576,385]      , [579,380]      , [579,389]      , [579,393]      , [577,393]      , [580,397]      , [580,402]      , [583,405]      , [582,410]      , [581,415]      , [577,416]      , [575,410]      , [570,412]      , [568,414]      , [566,410]      , [563,411]      , [562,412]      , [560,409]      , [550,410]      , [536,402]      , [530,402]      , [531,397]      , [526,399]      , [519,393]      , [513,388]      , [514,385]      , [514,385]      , [512,382]      , [512,380]      , [513,380]      , [513,378]      , [512,376]      , [508,366]      , [506,364]      , [500,360]      , [493,351]      , [487,345]      , [478,342]      , [470,344]      , [469,342]      , [466,338]      , [465,336]      , [464,334]      , [465,333]      , [465,331]      , [464,328]      , [461,326]      , [459,324]      , [459,323]      , [460,322]      , [460,320]      , [464,313]      , [471,322]      , [474,323]      , [476,323]      , [476,323]      , [478,323]      , [487,330]      , [487,321]      , [499,321]      ],
        47        : [[380,330]      , [388,331]      , [386,330]      , [394,327]      , [399,332]      , [409,333]      , [414,342]      , [417,341]      , [422,347]      , [429,349]      , [436,349]      , [427,370]      , [422,382]      , [420,390]      , [409,398]      , [404,402]      , [399,399]      , [393,397]      , [387,395]      , [374,391]      , [371,386]      , [369,383]      , [367,372]      , [366,368]      , [348,370]      , [350,362]      , [352,363]      , [356,357]      , [361,348]      , [367,340]      , [371,340]      , [369,330]      , [373,328]      , [376,329]      , [377,329]      , [380,330]      ],
        48        : [[329,123]      , [349,124]      , [371,125]      , [374,135]      , [382,145]      , [381,155]      , [387,157]      , [387,169]      , [390,174]      , [392,177]      , [395,178]      , [395,181]      , [394,185]      , [387,190]      , [385,197]      , [380,217]      , [375,235]      , [374,240]      , [374,240]      , [372,245]      , [369,244]      , [366,242]      , [364,241]      , [361,238]      , [360,235]      , [356,232]      , [352,229]      , [338,226]      , [336,212]      , [329,211]      , [324,203]      , [320,198]      , [318,196]      , [314,191]      , [313,190]      , [312,188]      , [313,182]      , [313,179]      , [314,158]      , [314,143]      , [315,122]      , [329,123]      ],
        49        : [[611,346]      , [623,351]      , [631,343]      , [634,357]      , [640,358]      , [640,360]      , [641,366]      , [652,364]      , [653,374]      , [669,365]      , [679,362]      , [684,355]      , [690,359]      , [693,361]      , [700,363]      , [699,366]      , [680,379]      , [665,389]      , [653,395]      , [638,407]      , [617,410]      , [618,421]      , [612,422]      , [613,417]      , [608,417]      , [608,422]      , [603,421]      , [602,425]      , [599,434]      , [594,434]      , [593,434]      , [591,433]      , [590,432]      , [591,429]      , [590,428]      , [586,428]      , [582,424]      , [581,420]      , [580,416]      , [584,412]      , [584,408]      , [584,404]      , [581,399]      , [580,396]      , [579,393]      , [580,391]      , [580,387]      , [580,383]      , [578,381]      , [581,378]      , [578,366]      , [582,359]      , [583,352]      , [579,349]      , [580,348]      , [581,344]      , [586,344]      , [602,332]      , [605,339]      , [600,341]      , [611,346]      ],
        50        : [[379,225]      , [382,213]      , [385,190]      , [396,183]      , [398,181]      , [401,181]      , [403,181]      , [412,187]      , [419,187]      , [429,190]      , [429,188]      , [439,194]      , [439,196]      , [434,201]      , [435,202]      , [436,202]      , [438,203]      , [443,208]      , [436,213]      , [435,215]      , [435,217]      , [435,218]      , [435,219]      , [439,218]      , [441,229]      , [446,238]      , [445,247]      , [445,264]      , [435,266]      , [424,273]      , [424,267]      , [421,265]      , [416,261]      , [414,260]      , [404,252]      , [402,252]      , [388,249]      , [384,247]      , [379,244]      , [376,244]      , [374,236]      , [377,233]      , [379,225]      ],
        51        : [[691,404]      , [695,402]      , [697,402]      , [700,398]      , [701,395]      , [705,388]      , [707,387]      , [712,386]      , [715,393]      , [718,395]      , [721,397]      , [724,397]      , [727,398]      , [732,401]      , [738,403]      , [740,400]      , [745,402]      , [751,403]      , [764,408]      , [770,408]      , [776,407]      , [779,405]      , [785,403]      , [788,402]      , [790,400]      , [793,401]      , [798,403]      , [797,410]      , [791,415]      , [787,421]      , [784,425]      , [780,438]      , [779,443]      , [779,445]      , [780,447]      , [780,449]      , [772,455]      , [774,456]      , [770,459]      , [767,462]      , [765,462]      , [762,466]      , [755,473]      , [753,479]      , [748,487]      , [744,493]      , [740,495]      , [740,502]      , [737,501]      , [730,500]      , [728,498]      , [725,495]      , [724,492]      , [722,490]      , [720,488]      , [715,488]      , [711,484]      , [705,476]      , [703,474]      , [700,472]      , [698,470]      , [696,469]      , [693,466]      , [691,465]      , [686,463]      , [675,463]      , [670,464]      , [685,428]      , [689,420]      , [686,410]      , [691,404]      ],
        52        : [[453,132]      , [456,129]      , [463,130]      , [467,130]      , [477,131]      , [493,132]      , [496,132]      , [502,132]      , [505,133]      , [507,134]      , [509,138]      , [510,141]      , [505,146]      , [506,148]      , [508,154]      , [513,151]      , [515,150]      , [520,146]      , [522,145]      , [525,143]      , [527,143]      , [532,144]      , [532,154]      , [532,158]      , [532,164]      , [536,170]      , [537,176]      , [538,183]      , [533,185]      , [538,193]      , [532,197]      , [509,198]      , [439,198]      , [442,190]      , [436,189]      , [438,175]      , [437,174]      , [436,174]      , [436,173]      , [435,171]      , [436,169]      , [436,167]      , [437,164]      , [435,157]      , [438,155]      , [440,153]      , [446,153]      , [449,153]      , [449,147]      , [448,136]      , [453,132]      ],
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
