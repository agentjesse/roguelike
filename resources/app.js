//create instance of MODDED bump library
const B = new Bump(PIXI);
//Create a Pixi Application, append to document:
const app = new PIXI.Application({width: 800, height: 700});
document.getElementById('insertionPoint').appendChild(app.view);

//create the square gameplay area called mainStage, it's a container that will hold non-hud children
//make the stage container
const mainStage = new PIXI.Container();
//background displayObject
const bkg = new PIXI.Graphics();
bkg.iD = 'background';//set the mainStage container's width and height by first....making a dummy object of required size..
bkg.beginFill(0x210b3f);
bkg.drawRect(0, 0, 700, 700);
mainStage.addChild(bkg);//..now add the dummy object
//make the view distance mask object and set it. draw later on frame updates
const circleMask = new PIXI.Graphics();
mainStage.mask = circleMask;//apply the object as mask to a displayObject
//add mainStage container to the app stage
app.stage.addChild(mainStage);

//HUD items added directly to the app stage
//life bar
const lifeBar = new PIXI.Graphics();
lifeBar.iD = 'lifeBar';//set the mainStage container's width and height by first....making a dummy object of required size..
lifeBar.beginFill(0xff0000);
lifeBar.drawRect(0, 0, 50, 130);//draw at origin...
lifeBar.position.set(725, 103);//then move to avoid surprise anchor errors
lifeBar.endFill();
app.stage.addChild(lifeBar);
//power stat text and lifebar text
const style = new PIXI.TextStyle({
	fontFamily: 'Arial',
	fontSize: 40,
	fill: '#00ffff'
});
const style2 = new PIXI.TextStyle({
	fontFamily: 'Arial',
	fontSize: 40,
	fill: '#ddddff'
});
const lifeStat = new PIXI.Text('Life:', style);
const powerStat = new PIXI.Text('Power: 0', style);
const stageStat = new PIXI.Text('Stage: 1', style2);
lifeStat.position.set(775,20);
powerStat.position.set(775,240);
stageStat.position.set(775,410);
powerStat.rotation += Math.PI * 0.5;
lifeStat.rotation += Math.PI * 0.5;
stageStat.rotation += Math.PI * 0.5;
app.stage.addChild(powerStat);
app.stage.addChild(lifeStat);
app.stage.addChild(stageStat);

//win banner added at end on top of everything and visibility controlled
//make it
const winBnr = new PIXI.Container();
const winBnrBase = new PIXI.Graphics();
winBnrBase.beginFill(0x003311);
winBnrBase.drawRect(0, 0, 800, 700);
winBnr.addChild(winBnrBase);
const style3 = new PIXI.TextStyle({
	fontFamily: 'Arial',
	fontSize: 150,
	fill: '#00ff00'
});
const winBnrTxt = new PIXI.Text('Winner!', style3);
winBnrTxt.anchor.set(0.5);
winBnrTxt.position.set( app.screen.width / 2, app.screen.height / 2 );
winBnr.addChild(winBnrTxt);
//add it
app.stage.addChild(winBnr);
//set behaviour
winBnr.visible = false;
winBnr.interactive = true;
winBnr.on('pointertap', function (){
	winBnr.visible = false;	
});

//Define any variables that are used in more than one function. For some reason this does not create global variables, checked by curlybrace scope check
let currentStage=1, enemyCount=3, cat, smartBox, wall, floorRef;
const rows=28, cols=28, maxRooms=10, roomSizeRange=[4,8];
let wallsArr = createDungeon();
const wallWidth = mainStage.width/cols;
const wallHeight = mainStage.height/rows;
// console.log('wallsArr: ',wallsArr);

//this fn will return a 'logic' 2d array of the dungeon grid filled with objects of types floor or wall that will be used later by react to render. it will also set a floorRef array of only floor spaces for spawning use
function createDungeon() {
  //here even though the room properties are first defined as height width x y, they can be read in any order in the params.
 const isValidRoomPlacement = (grid, {x, y, width = 1, height = 1}) => {
   // check if outside of the grid or on edge
   if (y < 2 || y + height > grid.length - 2) return false;
   if (x < 2 || x + width > grid[0].length - 2) return false;
   // check overlap...
   for (let i = y ; i < y + height; i++) {
     for (let j = x ; j < x + width; j++) {
       if (!grid[i][j]) return false;//if the array element is false then a floor is already set there
     }
   }
   // return true if all grid cells are clear
   return true;
 };
 //es6 below allows you to have backup values in the parameter declarations!
 const placeCells = (grid, {x, y, width = 1, height = 1, id}, type=false ) => {
   for (let i = y; i < y+height; i++) {
     for (let j = x; j < x+width; j++) {
       grid[i][j] = type;
     }
   }
   return grid;
 };
 //[min.max] was pushed into param declaration by you...source code assigns in body later.
 const createRoomsFromSeed = (grid, {x, y, width, height}, [min,max]= roomSizeRange) => {
   const roomValues = [];  // will hold possible rooms as objects for edges of the seed room
   const placedRooms = []; //array of rooms to return and use during recursion

   const north = { height: randInt(min, max+1), width: randInt(min, max+1) };//make room object
   north.x = randInt(x, x + width);//set properties. here x position of new room
   north.y = y - north.height - 1;//y pos of new room
   //next line will first get the minmum of the farthest right of the new room and the seed room. then it will choose a random x position between the farthest left of the seed room and the found minimum. i just realized the north room will never extend father to the left than the seed room, woah cool bug found. anyways, this x position is then used with the following y position (that is 1 less than the seed room y) to place a single 1x1 'door'.
   north.doorx = randInt(north.x, Math.min(north.x + north.width, x + width) );
   north.doory = y - 1;
   north.id= 'N';
   roomValues.push(north);//store possible north room
   
   const east = { height: randInt(min, max+1), width: randInt(min, max+1) };
   east.x = x + width + 1;
   east.y = randInt(y, height + y );
   east.doorx = east.x - 1;
   east.doory = randInt(east.y, Math.min(east.y + east.height, y + height));
   east.id= 'E';
   roomValues.push(east);//store possible east room

   const south = { height: randInt(min, max+1), width: randInt(min, max+1) };
   south.x = randInt(x, width + x );
   south.y = y + height + 1;
   south.doorx = randInt(south.x, Math.min(south.x + south.width, x + width) );
   south.doory = y + height;
   south.id='S';
   roomValues.push(south);

   const west = { height: randInt(min, max+1), width: randInt(min, max+1) };
   west.x = x - west.width - 1;
   west.y = randInt(y, height + y );
   west.doorx = x - 1;
   west.doory = randInt(west.y, Math.min(west.y + west.height, y + height) );
   west.id='W';
   roomValues.push(west);
  
   roomValues.forEach(room => {
     if (isValidRoomPlacement(grid, room)) {
       // place room
       grid = placeCells(grid, room);
       // place door
       grid = placeCells(grid, {x: room.doorx, y: room.doory});
       // need placed room values for the next seeds
       placedRooms.push(room);
     }
   });
   // console.log(placedRooms);
   return {grid, placedRooms};
 };
 const checkCell = (row,col) => {
  if(row === -1) return false;
  if(row === rows) return false;
  if(col === -1) return false;
  if(col === cols) return false;
  return grid[row][col];
 }
 //recursive fn
 //apparently with es6, declaring a variable inside the params does not need let or const or var..maybe because it will only be used in that scope? so below, counter and maxRooms are variable names available inside the block
 const growMap = (grid, seedRooms, counter=1, maxRms=maxRooms)=> {
  if (counter + seedRooms.length > maxRms || !seedRooms.length) {
    return grid;
  }
  //createRoomsFromSeed will return an object and store it in the grid variable with the new grid and array of rooms just placed. call it with the grid and the last room in seedRooms array.
  grid = createRoomsFromSeed(grid, seedRooms.pop());
  seedRooms.push(...grid.placedRooms);
  counter += grid.placedRooms.length;
  //when going into the recursion just pass in the grid part of the object stored in grid variable.
  return growMap(grid.grid, seedRooms, counter);
 }
 //-----------------------------------------------------end of helper fns, start creation code
 // 1. make logic 2d array, fill with walls by making all elements true
 let grid = Array(rows).fill().map( ()=> Array(cols).fill(true) );
 // 2. values for the first room 
 const [min, max] = roomSizeRange;
 const firstRoom = {
	 x: 12,
	 y: 12,
	 height:4,
	 width: 4,
	 id: 'O'
	};
 // 3. place the first room on to grid
	grid = placeCells(grid, firstRoom);
	// console.log(grid);//debugging check here is still good, shit walls not yet added, even on new level
 //growMap is a recursive fn that will eventually return a grid (a 2d array of boolean objects later used to render floors or walls) 
 grid = growMap(grid,[firstRoom]);

 //at this point use grid to make a coordinate array for spawning
 floorRef = [];
 for (let i=0 ; i<rows ; i++){
	 for (let j=0; j<cols ; j++) {
		 if( !grid[i][j] ) floorRef.push([i,j]);
	 }
 }
 
 //clean grid of extra walls before return for quick performance fix
 let gridCopy = arrayClone(grid);
 let neighbours;
  for(let i=0; i<rows; i++){
	  for (let j=0; j<cols; j++) {
		 neighbours = 0;
		 if( checkCell(i-1,j-1) ) neighbours++;
		 if( checkCell(i-1,j) ) neighbours++;
		 if( checkCell(i-1,j+1) ) neighbours++;
		 if( checkCell(i,j-1) ) neighbours++;
		 if( checkCell(i,j+1) ) neighbours++;
		 if( checkCell(i+1,j-1) ) neighbours++;
		 if( checkCell(i+1,j) ) neighbours++;
		 if( checkCell(i+1,j+1) ) neighbours++;
		 if(neighbours === 8) gridCopy[i][j] = false;
		 //edge cleanup
		 if ( i===0 || j===0 ) gridCopy[i][j]=false ;
		 else if ( i===rows-1 || j===rows-1 ) gridCopy[i][j]=false ;
		}
	}
	grid = gridCopy;
	//do this cleanup after, or first grid will be read
	let N, E, S, W;
	for(let i=0; i<rows; i++){
		for (let j=0; j<cols; j++) {
			N=E=S=W = false;
			neighbours = 0;
			if( checkCell(i-1,j-1) ) neighbours++;
			if( checkCell(i-1,j) ) { neighbours++; N=true; }
			if( checkCell(i-1,j+1) ) neighbours++;
			if( checkCell(i,j-1) ) { neighbours++; W=true; }
			if( checkCell(i,j+1) ) { neighbours++; E=true; }
			if( checkCell(i+1,j-1) ) neighbours++;
			if( checkCell(i+1,j) ) { neighbours++; S=true; }
			if( checkCell(i+1,j+1) ) neighbours++;
			if(neighbours === 2 && N && E) gridCopy[i][j] = false;
			if(neighbours === 2 && N && W) gridCopy[i][j] = false;
			if(neighbours === 2 && S && E) gridCopy[i][j] = false;
			if(neighbours === 2 && S && W) gridCopy[i][j] = false;
		}
	}
	grid = gridCopy;
	// console.log(grid);//debugging check here is still good

 return grid;//return the grid from createDungeon
 
}//end of createDungeon



// load textures to texture cache. they can be accessed in the setup later via the defined parameters, i guess auto passed in
PIXI.loader.add('cat', 'resources/cat.png') //give a name and provide url relative to baseurl of loader
          //  .add('blob', 'resources/blob.png')
          //  .on('progress', loadHandler ) //monitor load progress
           .load(setup);
//

function setup(loader, resources) {
	// make sprites from textures in cache, and make primitives
  cat = new PIXI.Sprite(resources.cat.texture);
	cat.iD = 'cat';//adding personal data to object
	cat.power = 0;
	cat.life = 10;
  cat.scale.set(0.32);
	cat.vx = cat.vy = 0;//make velocity variables on this cat sprite/ display object
  // cat.x = mainStage.width/2 - cat.width/2;//start location, do this inside this setup function after creating sprite
  // cat.y = mainStage.height/2 - cat.height/2;
	const catSpawnPt = floorRef.splice( randInt(0,floorRef.length), 1 )[0];
	// console.log('player at', catSpawnPt[0], catSpawnPt[1]);
	//divide by 10 was found by trial and error, maybe pixel value is better later 
	cat.position.set( catSpawnPt[1] * wallWidth + (cat.width/10), catSpawnPt[0] * wallHeight + (cat.height/10) );
  mainStage.addChild(cat);

	//2d array used to render walls
  wallsArr.forEach( (row,i) => {
    row.forEach( (cell,j) => {
      if(cell){
        wall = new PIXI.Graphics();
        wall.isWall = true;
				wall.iD = `wall row:${i} col:${j}`;
				wall.lineStyle(1, 0x000000);
        wall.beginFill(0x00b8e6);
        wall.drawRect(0, 0, wallWidth, wallHeight);//draw at origin, then move, or position will be off
        // wall.endFill();//honestly not sure if needed.
        wall.position.set( j*wallWidth, i*wallHeight );//j first because it determines column, or position along x axis
        mainStage.addChild(wall);
      }
    });
  });

  //enemies random locations INSIDE dungeon
  for (let i = 0 ; i<enemyCount ; i++){
		const spawnPt = floorRef.splice( randInt(0,floorRef.length), 1 )[0];
		// console.log('enemy at', spawnPt[0], spawnPt[1]);
		smartBox = new PIXI.Graphics();
		smartBox.iD = `enemy ${i}`;//personal data added to display object
		smartBox.strength = 2 * currentStage;
		smartBox.lineStyle(1, 0x000000);
		smartBox.beginFill(0xff0000); //start fill with red, i guess end not necessary
		//next lines use wall width also for enemy width, i don't really mind.
    smartBox.drawRect(0, 0, wallWidth, wallHeight);//draw at 0,0 then move later, or else primitives dont rotate correctly
    smartBox.position.set( spawnPt[1]*wallWidth, spawnPt[0]*wallHeight );
    mainStage.addChild(smartBox);
  }
  //powerup random locations INSIDE dungeon
  for (let i = 0 ; i<2 ; i++){
		const spawnPt = floorRef.splice( randInt(0,floorRef.length), 1 )[0];
		// console.log('powerup at', spawnPt[0], spawnPt[1]);
		smartBox = new PIXI.Graphics();
		smartBox.isPowerUp = true;
		smartBox.iD = `powerup ${i}`;//personal data added to display object
		smartBox.lineStyle(1, 0x000000);
		smartBox.beginFill(0x00ff00); //start fill with green, i guess end not necessary
		//next lines use wall width also for powerup width, i don't really mind.
    smartBox.drawRect(0, 0, wallWidth, wallHeight);//draw at 0,0 then move later, or else primitives dont rotate correctly
    smartBox.position.set( spawnPt[1]*wallWidth, spawnPt[0]*wallHeight );
    mainStage.addChild(smartBox);
  }
  
  // console.log('children of mainStage: ',mainStage.children.length);
  //start calling gameLoop
  app.ticker.add( gameLoop );
}//end of setup fn

//new level function based off of setup fn
function newLevel() {
	//update walls array before running code in this function, or else old will be used
	wallsArr = createDungeon();
	//reset enemyCount for gameloop
	enemyCount = 3;

	//set cat in new position
	const catSpawnPt = floorRef.splice( randInt(0,floorRef.length), 1 )[0];
	// console.log('player at', catSpawnPt[0], catSpawnPt[1]);
	//divide by 10 was found by trial and error, maybe pixel value is better later 
	cat.position.set( catSpawnPt[1] * wallWidth + (cat.width/10), catSpawnPt[0] * wallHeight + (cat.height/10) );

	//2d array used to render walls
  wallsArr.forEach( (row,i) => {
    row.forEach( (cell,j) => {
      if(cell){
        wall = new PIXI.Graphics();
        wall.isWall = true;
				wall.iD = `wall row:${i} col:${j}`;
				wall.lineStyle(1, 0x000000);
        wall.beginFill(0x00b8e6);
        wall.drawRect(0, 0, wallWidth, wallHeight);//draw at origin, then move, or position will be off
        // wall.endFill();//honestly not sure if needed.
        wall.position.set( j*wallWidth, i*wallHeight );//j first because it determines column, or position along x axis
				mainStage.addChild(wall);
      }
    });
	});

  //enemies random locations INSIDE dungeon
  for (let i = 0 ; i<enemyCount ; i++){
		const spawnPt = floorRef.splice( randInt(0,floorRef.length), 1 )[0];
		// console.log('enemy at', spawnPt[0], spawnPt[1]);
		smartBox = new PIXI.Graphics();
		smartBox.iD = `enemy ${i}`;//personal data added to display object
		smartBox.strength = 2 * currentStage;
		smartBox.lineStyle(1, 0x000000);
		smartBox.beginFill(0xff0000); //start fill with red, i guess end not necessary
		//next lines use wall width also for enemy width, i don't really mind.
    smartBox.drawRect(0, 0, wallWidth, wallHeight);//draw at 0,0 then move later, or else primitives dont rotate correctly
    smartBox.position.set( spawnPt[1]*wallWidth, spawnPt[0]*wallHeight );
    mainStage.addChild(smartBox);
  }
  //powerup random locations INSIDE dungeon
  for (let i = 0 ; i<2 ; i++){
		const spawnPt = floorRef.splice( randInt(0,floorRef.length), 1 )[0];
		// console.log('powerup at', spawnPt[0], spawnPt[1]);
		smartBox = new PIXI.Graphics();
		smartBox.isPowerUp = true;
		smartBox.iD = `powerup ${i}`;//personal data added to display object
		smartBox.lineStyle(1, 0x000000);
		smartBox.beginFill(0x00ff00); //start fill with green, i guess end not necessary
		//next lines use wall width also for powerup width, i don't really mind.
    smartBox.drawRect(0, 0, wallWidth, wallHeight);//draw at 0,0 then move later, or else primitives dont rotate correctly
    smartBox.position.set( spawnPt[1]*wallWidth, spawnPt[0]*wallHeight );
    mainStage.addChild(smartBox);
  }

}//end of newLevel fn 

//my attempt at keyboard movement
const directions = {'left':false, 'up':false, 'right':false, 'down':false};
document.addEventListener('keydown', event => {
		switch (event.keyCode) {
			case 37: directions.left = true; break;
			case 38: directions.up = true; break;
			case 39: directions.right = true; break;
			case 40: directions.down = true;
			//children on stage array check via spacebar, comment below for production
			// break;
			// case 32: console.log(mainStage.children);
		}
	}
);
document.addEventListener('keyup', event => {
    switch (event.keyCode) {
      case 37: directions.left = false; break;
      case 38: directions.up = false; break;
      case 39: directions.right = false; break;
      case 40: directions.down = false;
    }
  }
);


//game loop
// function gameLoop(delta){
const speedMultipler = 3;
function gameLoop(){
	//win showing? leave early
	if(winBnr.visible) return;
	//while cat is visible, or 'alive': move then check collisisions with all children of mainStage container
	if ( cat.visible && enemyCount ) {
		//handle view distance animation
		circleMask.clear();//remove all drawn graphics
		circleMask.beginFill(0x000000);//start redraw
		// circleMask.drawCircle(cat.x + cat.width/2, cat.y + cat.height/2, 120);
		circleMask.drawCircle(cat.x+8, cat.y+8, 120);

		//apply velocity vx and vy to cat's x and y position values. the && checks disable backtracking, which is better overall
		if ( directions.right && !directions.left ) cat.vx = 1;
		if ( directions.left && !directions.right ) cat.vx = -1;
		if ( directions.up && !directions.down ) cat.vy = -1;
		if ( directions.down && !directions.up ) cat.vy = 1;
		if ( !directions.left && !directions.right) cat.vx = 0;
		if ( !directions.up && !directions.down ) cat.vy = 0;
		cat.position.set( cat.x + cat.vx * speedMultipler, cat.y + cat.vy * speedMultipler );

		//handle collisions on frame change
		mainStage.children.forEach((child,index) => {
			//bkg added first,cat added 2nd.. check only rest of children 
			if(index>1){
				//push away cat from child if it is a wall
				if(child.isWall) B.rectangleCollision(cat,child);
	
				//not a wall? if collision is happening then...
				else if( B.hitTestRectangle(cat,child) ){
	
					//if collision with powerup
					if(child.isPowerUp){
						cat.power++;
						powerStat.text = `Power: ${cat.power}`;//docs ask for string but passing number works fine
						// console.log(`collision with ${child.iD}`);
						child.destroy(true);//cleanup. array in stage shrinks, careful with logic or player sprite may detect itself
					}
					//if collision with enemy
					else{
						child.strength > cat.power?
						(
							B.rectangleCollision(cat,child),
							console.log('ouch'),
							cat.life -= 0.5,
							lifeBar.scale.y = cat.life/10
						):
						(
							// console.log(`collision with ${child.iD}`),
							child.destroy(true),
							enemyCount--
						);
					}
					//handle cat life
					if (cat.life === 0){
						// console.log('life has reached zero');
						cat.visible = false;
					}
	
				}
				
			}
		});

	}
	//if enemy count has reached zero but cat still alive, update stage
	//check for win
	else if( cat.visible && !enemyCount ){
		//clean up children from mainstage after cat
		mainStage.children.forEach((child,index) => {
			//bkg added first,cat added 2nd..remove rest of children(the walls,enemies,and powerups) 
			//bug: next line removes children after bkg and cat..but the array itself is not reduced perfectly
			if(index>1) child.destroy(true);//cleanup. array in stage shrinks half-assedly, careful with logic or player sprite may detect itself
		});
		//fully remove elements after cat from mainStage children array
		mainStage.children.splice(2);

		//make new level using newLevel fn, it will add new children to mainstage array
		currentStage++;//enemy strength based off stage number, update dependent variable before making level
		//win when 4 stages complete...
		if(currentStage === 5){
			cat.visible = false;
			winBnr.visible = true;
			// console.log('Winner!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
		}//otherwise, load next level
		else{
			newLevel();//make and display it
			stageStat.text = `Stage: ${currentStage}`; //set HUD
			// console.log('now on stage: ',currentStage);
		}
	}
	//cat is not visible from win or life depletion? clear stage, reset cat, make new stage
	else{
		//only log death when stage is not the winning stage, as the cat is also made invisible when completing stage 4
		if ( currentStage !== 5) console.log('DEATH.');
		//clean up children from mainstage after cat
		mainStage.children.forEach((child,index) => {
			//bug: next line perfectly removes children after bkg and cat..but the array itself is not reduced perfectly
			if(index>1) child.destroy(true);//cleanup. array in stage shrinks half-assedly, careful with logic or player sprite may detect itself
		});
		//fully remove elements after cat from mainStage children array
		mainStage.children.splice(2);

		//resets and new stage
		cat.visible = true;
		cat.power = 0;
		cat.life = 10;
		lifeBar.scale.y = 1;
		powerStat.text = 'Power: 0';
		stageStat.text = 'Stage: 1';
		currentStage = 1;
		newLevel();
	}

}

//random integer, inclusive min exclusive max
function randInt(min, max) {
  //use below only if passing in floating point numbers
  // min = Math.ceil(min);
  // max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

//array deep cloner, if you just assign an array to a new variable, both variables reference the same array, so you need to make a new clean copy.
function arrayClone(arr){
  return JSON.parse(JSON.stringify(arr));
} 

// function loadHandler(loader,resource){
//   console.log(`an image named '${resource.name}' has loaded. current loading progress: ${loader.progress}%`);
// }