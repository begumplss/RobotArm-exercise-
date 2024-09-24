//----------------------------------------------------------------------------
// State Variable Setup 
//----------------------------------------------------------------------------

// This variable will store the WebGL rendering context
var gl;

//Collect shape information into neat package
var shapes = {
   wireCube: {points:[], colors:[], start:0, size:0, type: 0},
   solidCube: {points:[], colors:[], start:0, size:0, type: 0},
   axes: {points:[], colors:[], start:0, size:0, type: 0},
};

//Variables for Transformation Matrices
var mv = new mat4();
var p  = new mat4();
var mvLoc, projLoc;

//Model state variables
var shoulder = 0, elbow = 0;


//----------------------------------------------------------------------------
// Define Shape Data 
//----------------------------------------------------------------------------

//Some colours
var red = 		   	vec4(1.0, 0.0, 0.0, 1.0);
var green = 	   	vec4(0.0, 1.0, 0.0, 1.0);
var blue = 		   	vec4(0.0, 0.0, 1.0, 1.0);
var lightred =		vec4(1.0, 0.5, 0.5, 1.0);
var lightgreen =	vec4(0.5, 1.0, 0.5, 1.0);
var lightblue =   	vec4(0.5, 0.5, 1.0, 1.0);
var white = 	   	vec4(1.0, 1.0, 1.0, 1.0);
var purple = vec4(0.5, 0.0, 0.5, 1.0); // Purple color

//Generate Axis Data: use LINES to draw. Three axes in red, green and blue
shapes.axes.points = 
[ 
	vec4(  2.0,  0.0,  0.0, 1.0), //x axis, will be green
	vec4( -2.0,  0.0,  0.0, 1.0),
	vec4(  0.0,  2.0,  0.0, 1.0), //y axis, will be red
	vec4(  0.0, -2.0,  0.0, 1.0),
	vec4(  0.0,  0.0,  2.0, 1.0), //z axis, will be blue
	vec4(  0.0,  0.0, -2.0, 1.0)
];

shapes.axes.colors = 
[
	green,green,
	red,  red,
	blue, blue
];


//Define points for a unit cube
var cubeVerts = [
	vec4( 0.5,  0.5,  0.5, 1), //0
	vec4( 0.5,  0.5, -0.5, 1), //1
	vec4( 0.5, -0.5,  0.5, 1), //2
	vec4( 0.5, -0.5, -0.5, 1), //3
	vec4(-0.5,  0.5,  0.5, 1), //4
	vec4(-0.5,  0.5, -0.5, 1), //5
	vec4(-0.5, -0.5,  0.5, 1), //6
	vec4(-0.5, -0.5, -0.5, 1), //7
];

//Look up patterns from cubeVerts for different primitive types
//Wire Cube - draw with LINE_STRIP
var wireCubeLookups = [
	0,4,6,2,0, //front
	1,0,2,3,1, //right
	5,1,3,7,5, //back
	4,5,7,6,4, //right
	4,0,1,5,4, //top
	6,7,3,2,6, //bottom
];

//Solid Cube - draw with TRIANGLES, 2 triangles per face
var solidCubeLookups = [
	0,4,6,   0,6,2, //front
	1,0,2,   1,2,3, //right
	5,1,3,   5,3,7,//back
	4,5,7,   4,7,6,//left
	4,0,1,   4,1,5,//top
	6,7,3,   6,3,2,//bottom
];

//Expand Wire Cube data: this wire cube will be white...
for (var i =0; i < wireCubeLookups.length; i++)
{
   shapes.wireCube.points.push(cubeVerts[wireCubeLookups[i]]);
   shapes.wireCube.colors.push(purple);
}


//Expand Solid Cube data: each face will be a different color so you can see
//    the 3D shape better without lighting.

//Expand Solid Cube data: each face will be purple
for (var i = 0; i < solidCubeLookups.length; i++) {
    shapes.solidCube.points.push(cubeVerts[solidCubeLookups[i]]);
    shapes.solidCube.colors.push(purple); // Use purple color for all faces
}

//load data into points and colors arrays - runs once as page loads.
var points = [];
var colors = [];

//Convenience function:
//  - adds shape data to points and colors arrays
//  - adds primitive type to a shape
function loadShape(myShape, type)
{
   myShape.start = points.length;
   points = points.concat(myShape.points);
   colors = colors.concat(myShape.colors);
   myShape.size = points.length - myShape.start;
   myShape.type = type;
}

//----------------------------------------------------------------------------
// Initialization Event Function
//----------------------------------------------------------------------------

window.onload = function init() {
   // Set up a WebGL Rendering Context in an HTML5 Canvas
   var canvas = document.getElementById("gl-canvas");
   gl = canvas.getContext("webgl2");
   if (!gl) {
      canvas.parentNode.innerHTML("Cannot get WebGL2 Rendering Context");
   }

   //  Configure WebGL
   //  eg. - set a clear color
   //      - turn on depth testing
   gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
   gl.enable(gl.DEPTH_TEST);
   gl.clearColor(0.0, 0.0, 0.0, 1.0);
   gl.enable(gl.CULL_FACE);

   //  Load shaders and initialize attribute buffers
   var program = initShaders(gl, "shader.vert", "shader.frag");
   gl.useProgram(program);

   // Set up data to draw
   // Mostly done globally in this program...
   loadShape(shapes.wireCube, gl.LINE_STRIP);
   loadShape(shapes.solidCube, gl.TRIANGLES);
   loadShape(shapes.axes, gl.LINES);


   // Load the data into GPU data buffers and
   // Associate shader attributes with corresponding data buffers
   //***Vertices***
   var vertexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
   program.vPosition = gl.getAttribLocation(program, "vPosition");
   gl.vertexAttribPointer(program.vPosition, 4, gl.FLOAT, gl.FALSE, 0, 0);
   gl.enableVertexAttribArray(program.vPosition);

   //***Colors***
   var colorBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
   program.vColor = gl.getAttribLocation(program, "vColor");
   gl.vertexAttribPointer(program.vColor, 4, gl.FLOAT, gl.FALSE, 0, 0);
   gl.enableVertexAttribArray(program.vColor);

   // Get addresses of shader uniforms
   projLoc = gl.getUniformLocation(program, "p");
   mvLoc = gl.getUniformLocation(program, "mv");

   //Set up projection matrix
   var aspect = canvas.clientWidth/canvas.clientHeight;
   //p = ortho(-3.4*aspect, 3.4*aspect, -3.4, 3.4, 1.0, 20.0);
   p = perspective(40.0, aspect, 0.1, 100.0);

   gl.uniformMatrix4fv(projLoc, gl.FALSE, flatten(transpose(p)));

   //Set initial view
   var eye = vec3(0.0, 1.0, 10.0);
   var at = vec3(0.0, 0.0, 0.0);
   var up = vec3(0.0, 1.0, 0.0);

   mv = lookAt(eye, at, up);

   //Animate - draw continuously
   requestAnimationFrame(animate);
};



//----------------------------------------------------------------------------
// Animation and Rendering Event Functions
//----------------------------------------------------------------------------

//animate()
//updates and displays the model based on elapsed time
//sets up another animation event as soon as possible
var prevTime = 0;
function animate()
{
    requestAnimationFrame(animate);
    
    //Do time corrected animation
    var curTime = new Date().getTime();
    if (prevTime != 0)
    {
       //Calculate elapsed time in seconds
       var timePassed = (curTime - prevTime)/1000.0;
       //Update any active animations 
       handleKeys(timePassed);
    }
    prevTime = curTime;
    
    //Draw
    render();
}

function render() {
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
	
   var armShape = shapes.wireCube;
	var matStack = [];
	
	//Save view transform
	matStack.push(mv);
	
		//Position Shoulder Joint
		mv = mult(mv,translate(-2.0, 0.0, 0.0));
		//Shoulder Joint
		mv = mult(mv,rotate(shoulder, vec3(0,0,1)));
		//Position Upper Arm Cube
		mv = mult(mv,translate(1.0, 0.0, 0.0));
		//Scale and Draw Upper Arm
		matStack.push(mv);
			mv = mult(mv,scale(2.0, 0.4, 1.0));
			gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(mv)));
			gl.drawArrays(armShape.type, armShape.start, armShape.size);
		//Undo Scale
		mv = matStack.pop();

	
		//Position Elbow Joint
		mv = mult(mv, translate(1.0, 0.0, 0.0));
		//Elbow Joint
		mv = mult(mv, rotate(elbow,vec3(0,0,1)));
		//Position Forearm Cube
		mv = mult(mv, translate(1, 0.0, 0.0));
		//Scale and Draw Forearm
		matStack.push(mv);
			mv = mult(mv, scale(2.0, 0.4, 1.0));
			gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(mv)));
			gl.drawArrays(armShape.type, armShape.start, armShape.size);
		//Undo Scale
		mv = matStack.pop();
                // Draw fingers and thumb
var fingerShapes = [shapes.wireCube, shapes.wireCube, shapes.wireCube, shapes.wireCube, shapes.wireCube, shapes.wireCube, shapes.wireCube]; // Assuming you have defined finger shapes      
//Fingers above
                for (var i = 0; i < 3; i++) {
                    matStack.push(mv);

                    mv = mult(mv, translate(1.10 + i * -0.10, 0.40, 0.50)); // Adjust these values as needed
                    
            mv = mult(mv, rotate(90, vec3(0, 1, 0))); // Rotate the fingers vertically
    mv = mult(mv, rotate(-45, vec3(1, 0, 0.35))); // Rotate the fingers downward
  
    mv = mult(mv, scale(0.3 , 0.2 ,0.50));

                    gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(mv)));
                    gl.drawArrays(fingerShapes[i].type, fingerShapes[i].start, fingerShapes[i].size);


                     mv = matStack.pop();
               }
for (var i = 0; i < 3; i++) {
                    matStack.push(mv);

                    mv = mult(mv, translate(1.30 + i * -0.10, 0.70, 1.80)); // Adjust these values as needed
                    
            mv = mult(mv, rotate(90, vec3(0, 1, 0))); // Rotate the fingers vertically
    mv = mult(mv, rotate(180, vec3(1, 0, 0.35))); // Rotate the fingers downward
  
    mv = mult(mv, scale(0.3 , 0.2 ,0.50));

                    gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(mv)));
                    gl.drawArrays(fingerShapes[i].type, fingerShapes[i].start, fingerShapes[i].size);


                     mv = matStack.pop();
               }
        // Draw thumbs

// Draw thumbs
for (var j = 0; j < 2; j++) {
    matStack.push(mv);

    // Draw thumbs
for (var j = 0; j < 2; j++) {
    matStack.push(mv);

    // Adjust the translation values here
    mv = mult(mv, translate(1.10 + j * 0.40, -0.40, 0.80));

    mv = mult(mv, rotate(25, vec3(0, 0, -1))); // Rotate the thumb vertically
    mv = mult(mv, rotate((j === 0 || j === 3) ? -80 : 199, vec3(1, 0, 0.35))); // Rotate the thumb downward

    mv = mult(mv, scale(0.2, 0.2, 0.50));
    gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(transpose(mv)));
    gl.drawArrays(shapes.wireCube.type, shapes.wireCube.start, shapes.wireCube.size);

    mv = matStack.pop();
}




}


//----------------------------------------------------------------------------
// Keyboard Event Functions
//----------------------------------------------------------------------------

//This array will hold the pressed or unpressed state of every key
var currentlyPressedKeys = [];

//Store current state of shift key
var shift;

document.onkeydown = function handleKeyDown(event) {
   currentlyPressedKeys[event.keyCode] = true;
   shift = event.shiftKey;

   //Get unshifted key character
   var c = event.keyCode;
   var key = String.fromCharCode(c);

	//Place key down detection code here
}

document.onkeyup = function handleKeyUp(event) {
   currentlyPressedKeys[event.keyCode] = false;
   shift = event.shiftKey;
   
   //Get unshifted key character
   var c = event.keyCode;
   var key = String.fromCharCode(c);

	//Place key up detection code here
}

//isPressed(c)
//Utility function to lookup whether a key is pressed
//Only works with unshifted key symbol
// ie: use "E" not "e"
//     use "5" not "%"
function isPressed(c)
{
   var code = c.charCodeAt(0);
   return currentlyPressedKeys[code];
}

//handleKeys(timePassed)
//Continuously called from animate to cause model updates based on
//any keys currently being held down
function handleKeys(timePassed) 
{
   //Place continuous key actions here - anything that should continue while a key is
   //held

   
  // Finger and Thumb Movement
   var fingerRotationSpeed = 90.0; // degrees per second
   var fingerRotation = fingerRotationSpeed * timePassed;

   
   //Shoulder Updates
   if (shift && isPressed("S")) 
   {

      if (shoulder < 90) shoulder = (shoulder + d);
      else shoulder = 90;
   }
   if (!shift && isPressed("s")) 
   {
      if (shoulder > -90) shoulder = (shoulder - d);
      else  shoulder = -90;
   }
   
   //Elbow Updates
   if (shift && isPressed("E")) 
   {
      if (elbow < 0) elbow = (elbow + d);
      else  elbow = 0;
   }
   if (!shift && isPressed("e")) 
   {
      if (elbow > -144) elbow = (elbow - d);
      else elbow = -144;
   }

   

}
}