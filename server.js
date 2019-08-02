const demo = () => { console.log('helper'); }

demo();


const doSomething = name =>{ console.log(name); }

const taken = luke => doSomething(luke);

taken('willy');

const rowen = () => 'rowen'

nameHelper=rowen();

console.log(nameHelper);


var materials = ['Hydrogen','Helium','Lithium','Beryllium'];

console.log(materials.map(material => material.length));

var obj = JSON.parse(fs.readFileSync('./src/url.json', 'utf8'));

let miPrimeraPromise = new Promise((resolve, reject) => {
  // Llamamos a resolve(...) cuando lo que estabamos haciendo finaliza con éxito, y reject(...) cuando falla.
  // En este ejemplo, usamos setTimeout(...) para simular código asíncrono. 
  // En la vida real, probablemente uses algo como XHR o una API HTML5.
  setTimeout(function(){
    resolve("¡Éxito!"); // ¡Todo salió bien!
  }, 250);
});

miPrimeraPromise.then((successMessage) => {
  // succesMessage es lo que sea que pasamos en la función resolve(...) de arriba.
  // No tiene por qué ser un string, pero si solo es un mensaje de éxito, probablemente lo sea.
  console.log("¡Sí! " + successMessage);
});
