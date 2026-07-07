<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (isset($_POST['glb_adm_id']) && !empty($_POST['selected_glb_id'])) {
    $glb_adm_id = $_POST['glb_adm_id'];
    if($glb_adm_id=="DELETE") {
      // echo "Yes";
      // echo "No";
      $selected_glb_id = $_POST['selected_glb_id'];
      // echo "Admin - ".$glb_adm_id."<br><br>Selected Rows: <br>"; 
      foreach ($selected_glb_id as $recordId) {
        // echo $recordId."<br>";
        $updated_date = date( 'Y-m-d H:i:s' );
        $updated_by = $_SESSION[ 'adm_id' ];
        $sql_glb_updt = "UPDATE global_detail SET glb_status='3', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE glb_id=" . $recordId;
        $con->query($sql_glb_updt);
        }
    } else {
      // echo "No";
      $selected_glb_id = $_POST['selected_glb_id'];
      // echo "Admin - ".$glb_adm_id."<br><br>Selected Rows: <br>"; 
      foreach ($selected_glb_id as $recordId) {
        // echo $recordId."<br>";
        $updated_date = date( 'Y-m-d H:i:s' );
        $updated_by = $_SESSION[ 'adm_id' ];
        $sql_glb_updt = "UPDATE global_detail SET glb_adm_id='" . $glb_adm_id . "', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE glb_id=" . $recordId;
        $con->query($sql_glb_updt);
        }
    }
    // echo $glb_adm_id; exit;
    if($glb_adm_id=="DELETE") {
      header('Location: global_view.php?flag=6');
    } else {
      header('Location: global_view.php?flag=4');
    }
  } else {
    header('Location: global_view.php?flag=5');
  }
  // exit;
  exit();
}
?>