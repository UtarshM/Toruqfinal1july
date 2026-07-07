<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ( $_SESSION[ 'adm_type' ] != 0 ) {
  header( 'Location: #' );
}
if ( isset( $_POST[ "submit" ] ) ) {
  $ctg_name = addslashes( $_POST[ "ctg_name" ] );
  
  $ctg_status = addslashes( $_POST[ "ctg_status" ] );
   
  $added_by = $_SESSION[ 'adm_id' ];
  


  $ctg_added = date( 'Y-m-d H:i:s' );
  $ctg_updated = date( 'Y-m-d H:i:s' );
  // Check  Duplicate Record
  $query_ctg_dup = "SELECT * FROM category_detail where ctg_name='" . $ctg_name . "'  and ctg_status='1'";
  $result_dup = $con->query( $query_ctg_dup );
  $total_records_dup = $result_dup->num_rows;
  if ( $total_records_dup >= 1 ) {
    $flag = 11;
    $ctg_name = $ctg_name;
     $md_id = $md_id;
  } else {
    $sql_ctg_ins = "INSERT INTO category_detail (ctg_name, added_by, updated_by, ctg_status, ctg_added , ctg_updated) VALUES ('" . $ctg_name . "', '" . $added_by . "','" . $updated_by . "','" . $ctg_status . "','" . $ctg_added . "','" . $ctg_updated . "')";
    if ( $con->query( $sql_ctg_ins ) === TRUE ) {
      header( 'Location: category_view.php?flag=1' );
    } else {
      header( 'Location: category_add.php' );
    }
  }
  // Check  Duplicate Record
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="description" content="">
<meta name="author" content="">
<link rel="shortcut icon" href="images/favicon.png" type="image/png">
<title>Category -<?php echo " ".$project_title." "; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<script>
function myPassFunc() {
    var x = document.getElementById("myPassword");
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }
} 
</script>
</head>
<body>
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>
<div class="leftpanel">
  <div class="logopanel">
    <h1><span>[</span> bracket <span>]</span></h1>
  </div>
  <?php include("left-column.php");?>
</div>
<div class="mainpanel" >
<?php include("header.php");?>
<div class="pageheader">
  <h2><i class="fa fa-plus"></i> Category  </h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
      <li class="active">Category</li>
    </ol>
  </div>
</div>
<div class="contentpanel">
  <div class="row">
    <div class="col-md-12">
      <form method="post"  name="frmadmin_changepwd" enctype="multipart/form-data" id="" class="" action="" >
        <div class="panel panel-default">
          <div class="panel-heading">
            <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
            <h4 class="panel-title">Category</h4>
            <?php if(isset($flag)==11){?>
            <p style="color:red;">This name is already exists</p>
            <?php } ?>
            <p>Please set Category details here</p>
          </div>
          <div class="panel-body">
             
             
            <div class="form-group">
              <label class="col-sm-3 control-label">Name   <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="text"   name="ctg_name" value="<?php echo $ctg_name; ?>" class="form-control" placeholder="ex: HDFC" required />
              </div>
            </div>
             
            <div class="form-group">
              <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="ctg_status" >
                  <?php
                  $query_status = "SELECT * FROM status_detail WHERE status_id IN (1,2)";
                  $result_status = $con->query( $query_status );
                  while ( $row_status = $result_status->fetch_object() ) {
                    ?>
                  <option <?php if($row_status->status_id==1) { ?>selected<?php } ?> value="<?php echo $row_status->status_id?>" > <?php echo $row_status->status_name?> </option>
                  <?php } ?>
                </select>
              </div>
            </div>
            <div class="panel-footer">
              <div class="row">
                <div class="col-sm-9 col-sm-offset-3">
                  <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                  <button type="reset" class="btn btn-default">Reset</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/select2.min.js"></script> 
<script src="js/jquery.validate.min.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 
<script src="js/custom.js"></script>
</body>
</html>
