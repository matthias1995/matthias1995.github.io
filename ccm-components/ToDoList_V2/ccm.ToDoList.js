/**
 * @overview ccm ToDoList
 * @author Matthias Bernard 2016
 */
ccm.component( {
	name: 'ToDoList',
	config: {
		html:  [ ccm.store, { local: 'https://matthias1995.github.io/ccm-components/ToDoList_V2/templates.json' } ],
		key:   'defaultToDoListV2',
		store: [ ccm.store, { url: 'ws://ccm2.inf.h-brs.de/index.js', store: 'toDoList' } ],
		style: [ ccm.load, 'https://matthias1995.github.io/ccm-components/ToDoList_V2/style.css' ],
		user:  [ ccm.instance, 'https://kaul.inf.h-brs.de/ccm/components/user2.js' ]
	},

	Instance: function () {
		console.log("call Instance");
		var self = this;

		self.removeFromArray = function(array, index){
			delete array[index];
			for(var i = index; i < array.length - 1; ++i){
				array[i] = array[i + 1];
			}
			array.pop();
		};
/*------------------------------- DragAndDrop Event handler ---------------------------------------*/
		self.addDrag = function(dragLi, dragDiv, callback){
			function onDragOver(e){
				e.preventDefault();
				var srcLi = $(self.dragging).parent();
				var dstLi = $(e.delegateTarget);
				self.dragging.b = dstLi.index();
				if(srcLi.parent()[0] != dstLi.parent()[0]) {
					return;
				}
					
				var list = srcLi.parent().children();

				if(srcLi.index() > dstLi.index()) {
					var i = srcLi;
					while(dstLi.index() < i.index() ){
						i.append($(i.prev().children()[0]).detach());
						i = i.prev();
					}
				} else if(srcLi.index() < dstLi.index()) {
					var i = srcLi;
					while(dstLi.index() > i.index() ){
					  i.append($(i.next().children()[0]).detach());
					  i = i.next();
					}
				}
				dstLi.html($(self.dragging).detach());
			};
			$(dragLi).on("dragover",onDragOver);
			function onDragStart(e){
				self.dragging = e.delegateTarget;
				self.dragging.a = $(self.dragging).parent().index();
				e.originalEvent.dataTransfer.setData('Text','Dummy'); /* dummy data for firefox compatibility */
				$(e.delegateTarget).addClass("dragging");
			};
			$(dragDiv).on("dragstart",onDragStart);
			function onDrop(e){
				e.preventDefault();
				dragLi.children("div:first").removeClass("dragging");

				if(callback)
					callback(self.dragging.a,self.dragging.b);
			};
			$(dragLi).on("dragend",onDrop);
			
		};

/*------------------------------- filter Functions ---------------------------------------*/
		self.isOpenOrDone = function(toDoItem){
			return true;
		};
		self.isOpen = function(toDoItem){
			return !(toDoItem.done);
		};
		self.isDone = function(toDoItem){
			return toDoItem.done;
		};
/*------------------------------- init Function ---------------------------------------*/
		self.init = function ( callback ) {
			console.log("call init");
			self.store.onChange = function(){self.render();};
			self.toDoItemFilter = self.isOpenOrDone;
			callback();
		};
		self.getMaxToDoListID = function(toDoList){
			var max = 0;
			toDoList.forEach(
				function(e){
					if(e.id > max)
						max = e.id;
				}
			);
			return max;
		}
		self.state = {expansion : {}, edit : {}};
/*------------------------------- Render Function ---------------------------------------*/
		self.render = function ( callback ) {
			console.log("call render");
			var element = ccm.helper.element( self );

			var listContainer = ccm.helper.html( self.html.get( 'listContainer' ));
			element.html(listContainer);	
			
			self.store.get( self.key, 
				function ( dataset ) {
					if ( dataset === null  || dataset.toDoList == null)
						self.store.set( { key: self.key, toDoList: [] }, proceed );
					else
						proceed( dataset );

					function proceed( dataset ) {
						
						var toDoList = ccm.helper.find( self, '.toDoList' );
						var newItemText = element.find("input:text.newItemText");
						element.find(".addButton").click(
							function(){
								self.user.login( 
									function () {
										dataset.toDoList.push({text : ccm.helper.val(newItemText.val()), user : self.user.data().key, done : false, desc : $("textarea.newItemDescription").val(), id : self.getMaxToDoListID(dataset.toDoList) + 1});
										var li = self.constructLi(dataset,dataset.toDoList[dataset.toDoList.length-1], dataset.toDoList.length-1);
										newItemText.val("");
										toDoList.append(li);
										li.css("position","relative");
										li.animate({left : "-=100%", opacity : 0},0).animate({left : "+=100%",opacity : 1},1000,
											function(){
												self.store.set( dataset, 
													function () { 
														if(ccm.helper.find(self,"*:animated").length == 0)
															self.render(); 
													} 
												);
											}
										);
									} 
								);
							}
						);
						newItemText.keypress(
							function(e){
								if(e.keyCode == 13){
									element.find(".addButton").click();
								}
							}
						);
						var radioDiv = element.find(".radioDiv");
						switch(self.toDoItemFilter){
							case self.isOpenOrDone:
								radioDiv.find("#all").prop("checked", true);
								break;
							case self.isDone:
								radioDiv.find("#done").prop("checked", true);
								break;
							case self.isOpen:
								radioDiv.find("#open").prop("checked", true);
								break;
						}
						radioDiv.find("#all").click(
							function(e){
								self.toDoItemFilter = self.isOpenOrDone;
								self.render();
							}
						);
						
						radioDiv.find("#done").click(
							function(e){
								self.toDoItemFilter = self.isDone;
								self.render();
							}
						);
						radioDiv.find("#open").click(
							function(e){
								self.toDoItemFilter = self.isOpen;
								self.render();
							}
						);
						dataset.toDoList.forEach(
							function(el,i){
								if(el == null){
									self.removeFromArray(dataset.toDoList, i);
									return;
								}
								if(!self.toDoItemFilter(el))
									return;
								toDoList.append(self.constructLi(dataset,el,i));
							}
						);
					}
				} 
			);
			if(callback) 
				callback();
			console.log("exit");
		};
/*------------------------------- construct list element from dataset ---------------------------------------*/
		self.constructLi = function(dataset, el, i){
			var li = ccm.helper.html( self.html.get( 'listItem' ));
			var dragDiv = li.children("div");
			var checkBox = li.find("div.chkBox:first");
			var delButton = li.find("div.delButton");
			var expandButton = li.find("div.expandButton");
			var editButton = li.find("div.editButton");
			
			editButton.text("\u270E");
			var listItemText = li.find(".itemDescription");
			listItemText.text(dataset.toDoList[i].desc);
			
			if(!self.state.expansion.hasOwnProperty(dataset.toDoList[i].id)){
				hideDescription(0);
				listItemText.hide();
			} else {
				showDescription(0);
			}
			
			
			//li.find("span.text").text(dataset.toDoList[i].text);
			if(self.state.edit[dataset.toDoList[i].id]){
				enableEdit();
			} else {
				disableEdit();
			}
			
			
			
			li.find("span.user").text(dataset.toDoList[i].user);
			checkBox.text("\u2713");
			delButton.text("\u2718");

			if(dataset.toDoList[i].done)
				checkBox.addClass("checked");
			else 
				checkBox.removeClass("checked");
			checkBox.click(
				function(){
					if(dataset.toDoList[i].done){
						dataset.toDoList[i].done = false;
						checkBox.removeClass("checked");
					} else {
						dataset.toDoList[i].done = true;
						checkBox.addClass("checked");
					}	
					self.store.set( dataset,function(){self.render()});		
				}
			);
			delButton.click(
				function(){
					self.removeFromArray(dataset.toDoList, i);
					li.css("position","relative");
					li.animate({left : "+=100%", opacity: 0},1000,
						function(){
							self.store.set( dataset, 
								function () { 
									if(ccm.helper.find(self,"*:animated").length == 0)
										self.render(); 
								}
							);	
						}
					);
					
				}
			);
			expandButton.click(
				function(){
					if(self.state.expansion[dataset.toDoList[i].id]){
						hideDescription();
					} else {
						showDescription();
					}
				}
			);
			editButton.click(
				function() {
					if(self.state.edit[dataset.toDoList[i].id]){
						disableEdit();
					} else {
						enableEdit();
					}
					
				}
			);
			
			// slide Description in and out
			function hideDescription(time = 500, callback){
				li.find(".itemDescription").slideUp(time,callback);
				expandButton.text("\u25bc");
				delete self.state.expansion[dataset.toDoList[i].id];
				console.log("hide");
			}
			function showDescription(time = 500, callback){
				li.find(".itemDescription").slideDown(time,callback);
				expandButton.text("\u25b2");
				self.state.expansion[dataset.toDoList[i].id] = true;
				console.log("show");
			}
			
			function enableEdit(){
				showDescription(self.state.edit[dataset.toDoList[i].id] ? 0 : 500,
					function(){
						var text = $("<input type='text' class='text' ></input>");
						var itemDescription = $("<textarea class='itemDescription' ></textarea>");
						text.val(dataset.toDoList[i].text);
						itemDescription.val(dataset.toDoList[i].desc);
						itemDescription.css({"height": dataset.toDoList[i].desc.split("\n").length + 2 + "em"});
						itemDescription.bind('input propertychange',
							function(){
								dataset.toDoList[i].desc = itemDescription.val();
								self.store.set( dataset);
							}
						);
						text.bind('input propertychange',
							function(){
								dataset.toDoList[i].text = text.val();
								self.store.set( dataset);
							}
						);
						console.log( dataset.toDoList[i].desc.split("\n").length);
						li.find(".text").replaceWith(text);
						li.find(".itemDescription").replaceWith(itemDescription);
						self.state.edit[dataset.toDoList[i].id] = true;
					}
				);
			}
			
			function disableEdit(){
				var span = $("<span class='text' ></span>");
				var itemDescription = $("<div class='itemDescription' ></div>");
				span.text(ccm.helper.val(dataset.toDoList[i].text));
				itemDescription.html(markupHyperLinks(ccm.helper.val(dataset.toDoList[i].desc)));
				if(!self.state.expansion[dataset.toDoList[i].id])
					itemDescription.hide();
				li.find(".text").replaceWith(span);
				li.find(".itemDescription").replaceWith(itemDescription);
				delete self.state.edit[dataset.toDoList[i].id];
				if(el.done)
				li.find("span.text").css("text-decoration","line-through");
			}
			
			// ---------------------- highlight hyperlinks and embed images ---------------------
			function markupHyperLinks(str){
				var reg = new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi);
				var match = str.match(reg);
				var res = "";
				if(match != null)
					match.forEach(
						function(e){
							var tmp = str.split(e)[0];
							if(tmp != "")
								res += "<pre>" + tmp + "</pre>";
							var m = e.match(new RegExp(/.*jpg|.*bmp|.*gif|.*png|.*jpeg/));
							if(m != null && m.indexOf(e) != -1)
								res += "<img style='width:100px; height:auto' src='" + e + "'></img>";
							else
								res += "<a href='" + e + "'>" + e + "</a>";
							var i = str.indexOf(tmp + e) + (tmp + e).length;
							str = str.substring(i,str.length);
						}
					);
				if(str != "")
					res += "<pre>" + str + "</pre>"
				console.log(res);
				return res;
			}
			// ------------------- add listener for drag and drop ------------------------------
			self.addDrag($(li),$(dragDiv), 
				function(a,b){
					self.user.login( 
						function () {
							console.log("move " + a + " " + b);
							if(a > b){
								var tmp = dataset.toDoList[a];
								for(var i = a; i > b; --i){
									dataset.toDoList[i] = dataset.toDoList[i - 1];
								}
								dataset.toDoList[b] = tmp;
							} else if(a < b){
								var tmp = dataset.toDoList[a];
								for(var i = a; i < b; ++i){
									dataset.toDoList[i] = dataset.toDoList[i + 1];
								}
								dataset.toDoList[b] = tmp;
							}
							self.store.set( dataset, function () { self.render(); });
						} 
					);
				}
			);
			return li;
		}
	}
} );