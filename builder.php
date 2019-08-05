<?php
include('data.php');

class builder extends data
{
public $entity;
public $net;
public $data;
public $store;
public $user;
public $service;
public $attribute;
public $variable;
public $code;
private static $instance;

function __construct($net) {

    
    
$this->net = $net;
$this->startDataBase();
$this->search = array();



$id = ($this->net['action']->module['id']);

$input = $this->net['action']->data['input'];

$this->_INPUT($input);


// 

// $this->_FETCH('eav');

$this->_PUT('eav',array(array('entity'=>'sample','rwx'=>'777','attribute'=>'name')));



$this->net['action']->data['output'] = $this->_FETCH('eav');



if($this->SERVICE_BLOCK($id)){

    
$this->net['action']->model = $this->SERVICE_BLOCK($id);



}else{
$this->net['action']->redirect('404');
}


}

 public function instance($net)
 {
    return self::$instance ? self::$instance : (self::$instance = new self($net));
 }

function SERVICE_BLOCK($entity){
    
      $block =$this->net['action']->READ('stage.blocks');
      
      return $block[$entity];
    
}


function _INPUT($input){
    
    
    foreach($input as $model){
        
    }
    
    return $input;
    
}


function _OUTPUT($output){

 
    
    
}

function RWX($rwx){


  array( 
         777=>array('owner'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE),'group'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE),'any'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE)),
         755=>array('owner'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE),'group'=>array('r'=>TRUE,'w'=>FALSE,'x'=>TRUE),'any'=>array('r'=>TRUE,'w'=>FALSE,'x'=>TRUE)),
         700=>array('owner'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE),'group'=>array('r'=>FALSE,'w'=>FALSE,'x'=>FALSE),'any'=>array('r'=>FALSE,'w'=>FALSE,'x'=>FALSE)),
         666=>array('owner'=>array('r'=>TRUE,'w'=>TRUE,'x'=>FALSE),'group'=>array('r'=>TRUE,'w'=>TRUE,'x'=>FALSE),'any'=>array('r'=>TRUE,'w'=>TRUE,'x'=>FALSE)),
         644=>array('owner'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE),'group'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE),'any'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE)),
         600=>array('owner'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE),'group'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE),'any'=>array('r'=>TRUE,'w'=>TRUE,'x'=>TRUE))
  );
    



}


function _RULE(){}


function _ERROR(){

  $list = array('value','format','forbiden');

  return array('error'=>'','message'=>'');
}



function _WRITE(){
    
    
}


function _SEND(){
    
    
    
}


function _FETCH($entity){
    
     return $this->GET_COLLECTION($entity);
    
    
}



function _TRIGGER(){
    
    
    
    
}


function _PLAY(){
    
    
}


function _STOP(){
    
    
    
}


function _PAUSE(){
    
    
}


function _GO(){
    
    
}


function _BACK(){
    
    
}


function _FORWARD(){
    
    
    
}


function _BACKWARD(){
    
    
    
}


function _UPDATE($model,$fields){
    
}


function _PUT($model,$fields){
    
  return $this->PUSH($model,$fields);
    
}

function _GET($model,$fields){
    
    
}

function _DEL($model,$fields){
    
}


function _COLLECTION($model,$filter){


}



function _FILTER(){
    
    
    
}



function _JOIN($collections,$glue){
    
    
}


function _EXPLOTE($collection,$explosive){
    
    
}

function ENTITY($entity,$id,$name,$value,$type,$action,$state,$rwx=777,$input=array(),$output=array()){

  return array(
         'entity'=>$entity,
         'id'=>$id,
         'name'=>$name,
         "type"=>$type,
         "value"=>$value,
         "action"=>$action,
         "state"=>$state,
         "rwx"=>$rwx,
         'input'=>$input,
         'output'=>$output
         );
      
}

function TYPE($data){

     $type = $data['type'];
     
     $value = $data['value'];
     

     $types = array('simple','number','option','object','multiple','text','boolean');

     if(in_array($type,$types)){

      if($type=='number'){
         if(is_numeric($value)){
           return TRUE;
         }else{
           return FALSE;
         }
          
      }

      if($type=='simple'){

        if(is_string($value)){
          return TRUE;
        }else{
          return FALSE;
        }


      }

      if($type=='option'){

          if(is_array($value)){
            return TRUE;
          }else{
            return FALSE;
          }
        
      }

      if($type=='multiple'){
          
        if(is_array($value)){
          return TRUE;
        }else{
          return FALSE;
        }

      }

      if($type=='object'){
         if(is_array($value)){
           return TRUE;
         }else{
           return FALSE;
         }
      }
     
      
     }else{

     return FALSE;

     }



}

function STATES(){

    $states = array('play','run','stop','pause','broken','fail','complete','avail','lose');

}


}





?>
