//create instance of bump library
let B = new Bump(PIXI);
//Create a Pixi Application, append to document:
// const app = new PIXI.Application({width: 800, height: 600});
const app = new PIXI.Application(); //default same as above
document.getElementById('insertionPoint').appendChild(app.view);

//create the square gameplay area called mainStage, non-ui children will be added to it
let mainStage = new PIXI.Container();
bkg = new PIXI.Graphics();
bkg.iD = 'background';//set the mainStage container's width and height by first....making a dummy object of required size..
bkg.beginFill(0x4d0038);
bkg.drawRect(0, 0, 600, 600);
// bkg.endFill();
mainStage.addChild(bkg);//..now add the dummy object
app.stage.addChild(mainStage);
// console.log(mainStage.width);
// console.log(mainStage.height);

//Define any variables that are used in more than one function. For some reason this does not create global variables, checked by curlybrace scope check
let cat, redBox, wall, rows=28, cols=28, maxRooms=10, roomSizeRange=[4,8];
let wallsArr = createDungeon();
// let wallsArr = [];//dummy
const wallWidth = mainStage.width/cols;
const wallHeight = mainStage.height/rows;
console.log('wallsArr: ',wallsArr);

//this fn will return a 'logic' 2d array of the dungeon grid filled with objects of types floor or wall that will be used later by react to render.
function createDungeon() {
  //here even though the room properties are first defined as height width x y, they can be read in any order in the params.
 const isValidRoomPlacement = (grid, {x, y, width = 1, height = 1}) => {
   // check if outside of the grid or on edge
   if (y < 2 || y + height > grid.length - 2) return false;
   if (x < 2 || x + width > grid[0].length - 2) return false;
   // check overlap...this nested for loop can actually be removed...ugly result
   for (let i = y ; i < y + height; i++) {
     for (let j = x ; j < x + width; j++) {
       if (grid[i][j] === false) return false;//the array element should be false where a new room wants to be put
     }
   }
   // return true if all grid cells are clear
   return true;
 };
 //es6 below allows you to have backup values in the parameter declarations! 
 const placeCells = (grid, {x, y, width = 1, height = 1, id}, type=false ) => {
   for (let i = y; i < y+height; i++) {
     for (let j = x; j < x+width; j++) {
       //grid[i][j] = {type, id};//remove id for clean dev check
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
  //-----------------------------------------------------end of helper fns, start creation code
 // 1. make logic 2d array, fill with walls by making all elements true
 let grid = Array(rows).fill().map( ()=> Array(cols).fill(false) );
 for (let i = 0; i<rows; i++) {
  //  grid.push([]);
   for (let j = 0; j<cols; j++) {
     // grid[i].push({type: 0, opacity: 0.6});
     grid[i][j] = true;
   }
 }
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
 //growMap is a recursive fn that will eventually return a grid (a 2d array of objects later used to render floors or walls) 
 grid = growMap(grid,[firstRoom]);

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

 return grid;//return the grid from createDungeon..mission over
 
}//end of createDungeon



// load textures to texture cache. they can be accessed in the setup later via the defined parameters, i guess auto passed in
PIXI.loader.add('cat', 'resources/cat.png') //give a name and provide url relative to baseurl of loader
          //  .add('blob', 'resources/blob.png')
          //  .on('progress', loadHandler ) //monitor load progress
           .load(setup);
//

function setup(loader, resources) {
  //2d array used to render walls
  wallsArr.forEach( (row,i) => {
    row.forEach( (cell,j) => {
      if(cell){
        wall = new PIXI.Graphics();
        wall.isWall = true;
        wall.iD = `wall row:${i} col:${j}`;
        wall.beginFill(0x0088ab);
        wall.drawRect(0, 0, wallWidth, wallHeight);//draw at origin, then move, or position will be off
        wall.position.set( j*wallWidth, i*wallHeight );//j first because it determines column, or position along x axis
        mainStage.addChild(wall);
      }
    });
  });
  

  // make sprites from textures in cache, and make primitives
  cat = new PIXI.Sprite(resources.cat.texture);
  cat.iD = 'cat';//adding personal data to object
  cat.scale.set(0.25);
  cat.vx = cat.vy = 0;//make velocity variables on this cat sprite/ display object
  cat.x = mainStage.width/2 - cat.width/2;//start location, do this inside this setup function after creating sprite
  cat.y = mainStage.height/2 - cat.height/2;

  /*
  //boxes random
  for (let i = 1 ; i<7 ; i++){
    redBox = new PIXI.Graphics();
    redBox.iD = `littleSquare${i}`;//personal data added to display object
    redBox.beginFill(0xff0000); //start fill with red, i guess end not necessary
    redBox.drawRect(0, 0, 10, 10);//draw at 0,0 then move later, or else primitives dont rotate correctly
    redBox.position.set( i*30+320, randInt(0,mainStage.height/2) );//careful of decimals when diving
    mainStage.addChild(redBox);
  }
  */

  // Add cat LAST so collision check later doesnt trigger too early.
  mainStage.addChild(cat);
  console.log('children of mainStage: ',mainStage.children.length);
  //start calling gameLoop
  app.ticker.add( gameLoop );
}

//my attempt at keyboard movement
let directions = {'left':false, 'up':false, 'right':false, 'down':false};
document.addEventListener('keydown', event => {
    switch (event.keyCode) {
      case 37: directions.left = true; break;
      case 38: directions.up = true; break;
      case 39: directions.right = true; break;
      case 40: directions.down = true;
      //children on stage array check via spacebar, comment below for production
      // break;
      // case 32: console.log(app.stage.children,cat.x,cat.y);
      // case 32: console.log(mainStage.children.length);
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
let speedMultipler = 3;
function gameLoop(){
  //apply velocity vx and vy to cat's x and y position values. the && checks disable backtracking, which is better overall
  if ( directions.right && !directions.left ) cat.vx = 1;
  if ( directions.left && !directions.right ) cat.vx = -1;
  if ( directions.up && !directions.down ) cat.vy = -1;
  if ( directions.down && !directions.up ) cat.vy = 1;
  if ( !directions.left && !directions.right) cat.vx = 0;
  if ( !directions.up && !directions.down ) cat.vy = 0;
  cat.position.set( cat.x + cat.vx * speedMultipler, cat.y + cat.vy * speedMultipler );

  //check collisisions with all children of mainStage container
  /*
  mainStage.children.forEach((child,index) => {
    if(index>0 && index < mainStage.children.length - 1){//bkg added first,cat added last.. check only rest of children 
      if(child.isWall) B.rectangleCollision(cat,child);
      // else if( child.visible && B.hitTestRectangle(cat,child) ){
      else if( B.hitTestRectangle(cat,child) ){
          // child.visible = false;
          console.log(`collision with ${child.iD}`);
          child.destroy(true);//cleanup. array in stage shrinks, careful with logic or player sprite may detect itself
      }
    }
  });
  */

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