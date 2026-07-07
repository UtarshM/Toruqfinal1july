<?php
// Set TimeZone 
date_default_timezone_set('Asia/Kolkata');
// $con = new Db_connect("localhost","happyh50_torque_auto_advisor","S1zd5vc8Xhp2SuV","happyh50_torque_auto_advisor");
$connection = mysqli_connect('localhost','happyh50_vehicleinsurance','xSO1eqNT6FKzhs','happyh50_vehicleinsurance');

$tables = array();
$result = mysqli_query($connection,"SHOW TABLES");
while($row = mysqli_fetch_row($result)){
  $tables[] = $row[0];
}

$return = '';
foreach($tables as $table){
  $result = mysqli_query($connection,"SELECT * FROM ".$table);
  $num_fields = mysqli_num_fields($result);
  
	//  $return .= 'DROP TABLE '.$table.';';
  $row2 = mysqli_fetch_row(mysqli_query($connection,"SHOW CREATE TABLE ".$table));
  $return .= "\n\n".$row2[1].";\n\n";
  
  for($i=0;$i<$num_fields;$i++){
    while($row = mysqli_fetch_row($result)){
      $return .= "INSERT INTO ".$table." VALUES(";
      for($j=0;$j<$num_fields;$j++){
        $row[$j] = addslashes($row[$j]);
        if(isset($row[$j])){ $return .= '"'.$row[$j].'"';}
        else{ $return .= '""';}
        if($j<$num_fields-1){ $return .= ',';}
      }
      $return .= ");\n";
    }
  }
  $return .= "\n\n\n";
}

//save file
$date_string=date("d-m-Y-h-i-s");
$handle = fopen("db-export/torqueautoadvisor-sf-backup-".$date_string.".sql","w+");
fwrite($handle,$return);
fclose($handle);
echo "Successfully backed up";

?>