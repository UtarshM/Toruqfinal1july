<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();
// echo $row_state['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "11", $md_right ) ) {
  header( 'Location: insurance_dashboard.php' );
}
// Check Module Rights

$plc_id = $_GET[ 'plc_id' ];

if ( isset( $_POST[ "submit" ] ) ) {

  /////// IMAGE UPLOAD
  if(!empty($_FILES['plc_pdf']['name']))	
  {	
    // EXT VALIDATION
    $file_ext=strtolower(end(explode('.',$_FILES['plc_pdf']['name'])));
    $valid_exts = array('pdf','PDF');
    if (in_array($file_ext, $valid_exts)) { 
    // echo "Valid File";
      ///// FILE EXT 
      $file_ext_img=strtolower(end(explode('.',$_FILES['plc_pdf']['name'])));
      $valid_exts_img = array('pdf','PDF');
        if (in_array($file_ext_img, $valid_exts_img)) { 
          // echo "IMAGE HERE";
          ////// IMAGE UPLOAD
          if(!empty($_FILES['plc_pdf']['name']))	
          {				
            // $ran1=rand(1,9999);
            $ran1 =date("d-m-y-h-i-s");
            $file_name = $_FILES['plc_pdf']['name'];
            $file_tmp =$_FILES['plc_pdf']['tmp_name'];
            
            $benner = $ran1.$file_name;
            move_uploaded_file($file_tmp,"img/plc_pdf_file/".$benner);
          }
        } 
    } else {
    // echo " IN Valid File";
    header("Location: policy_edit.php?msg=erimgext&plc_id=".$plc_id);  exit;
    }
      ///// FILE EXT 
   } else {
      $benner = $_POST['hdp_image'];
   }
  ////// IMAGE UPLOAD

  $branch_id = $_SESSION[ 'adm_branch' ];
  $plc_date = addslashes( $_POST[ "plc_date" ] );
  $plc_name = addslashes( $_POST[ "plc_name" ] );
  $plc_regno = addslashes( $_POST[ "plc_regno" ] );
  $plc_pdf = $benner;
  $plc_status = addslashes( $_POST[ "plc_status" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE policy_detail SET plc_date='" . $plc_date . "', plc_regno='" . $plc_regno."', plc_pdf='" . $plc_pdf."', plc_name='" . $plc_name."', updated_by='" . $updated_by . "', plc_status='" . $plc_status . "', updated_date='" . $updated_date . "' WHERE plc_id=" . $plc_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: policy_view.php?flag=2' ); exit;
  } else {
    header( 'Location: policy_edit.php?plc_id='.$plc_id.'' );  exit;
  }
}

$query_state_detail = "SELECT * FROM policy_detail ld where ld.plc_id=" . $plc_id." and plc_status!='3' ";
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();
if($row_state->branch_id != $_SESSION['adm_branch']) {
  header( 'Location: insurance_dashboard.php' );
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Policy PDF Edit   -<?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
  function validation() {
    var a = document.getElementById("password").value;
    var b = document.getElementById("confirmPassword").value; 
    if (a !== b) {
      alert("New password and Confirm password not mached");
      document.getElementById('password').focus();
      return false;
    }
  }
   
</script> 
<script>
    function deleterec1(plc_id) {
      if (confirm("Are you sure want to delete pdf ?")) {
        window.location = "policy_pdf_delete.php?plc_id=" + plc_id;
      }
    }
  </script>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
</head>

<body>
<!-- Preloader -->
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>
<section>
  <div class="leftpanel">
    <div class="logopanel">
      <h1><span>[</span> bracket <span>]</span></h1>
    </div>
    <!-- logopanel -->
    <?php include("left-column.php"); ?>
    <!-- leftpanelinner --> 
  </div>
  <!-- leftpanel -->
  <div class="mainpanel">
    <?php include("header.php"); ?>
    <div class="pageheader">
      <h2><i class="fa fa-pen"></i> Policy PDF Edit </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
          <li class="active">Policy PDF Edit </li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="row">
        <div class="col-md-12">
          <form method="post" name="frmadmin_changepwd" enctype="multipart/form-data" id="" class="" action="">
            <div class="panel panel-default">
              <div class="panel-heading">
                <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
                <h4 class="panel-title">Policy PDF Details</h4>
                <p>Please set policy details here</p>
                <?php
                if ($_GET['msg'] == "erimgext") {
                  echo "<span style='color:red; font-size:14px;'>File type wrong, Please select only PDF</span>";
                }
                ?>
              </div>
              <div class="panel-body">
                 
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Policy PDF Code <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->plc_code_no; ?>"  />
                  </div>
                </div>
                
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="plc_date" id="plc_date" value="<?php $datend   = new DateTime($row_state->plc_date); echo $datend->format('Y-m-d'); ?>" class="form-control" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
                  </div>
                </div>
                 
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Reg No.  <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="plc_regno" class="form-control" value="<?php echo $row_state->plc_regno ?>" placeholder="GJ01AJ5896" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                    <label class="col-sm-3 control-label">Policy PDF PDF (Only PDF) <span class="asterisk">*</span></label>
                    <div class="col-sm-4">
                      <input type="file" name="plc_pdf" <?php if ($row_state->plc_pdf == "") { ?>required<?php  } ?> value="<?php echo $row_state->plc_pdf ?>" class="form-control" />
                      <input type="hidden" name="hdp_image" id="hdp_image" value="<?php echo  $row_state->plc_pdf ?>" />
                    </div>
                    <div class="col-sm-5">
                      <?php if ($row_state->plc_pdf != '') {

                      ?>
                        <iframe src="img/plc_pdf_file/<?php  echo $row_state->plc_pdf; ?>" width="100%" height="200px"></iframe>
                        
                        <a href="javascript:deleterec1('<?php echo $row_state->plc_id ?>')" class="link" style="font-size:12px">Remove</a>
                      <?php

                      } else {

                        echo "PDF not available";
                      }

                      ?>
                    </div>
                  </div>

                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="plc_name" class="form-control" value="<?php echo $row_state->plc_name ?>" placeholder="Jakirhusen Parasara" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
             

             


            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="plc_status" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?>>
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id!=3";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if ($row_status->status_id == $row_state->plc_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <!-- panel-body -->
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-12 col-lg-12 col-md-12 col-xs-12 ml_15">
                    <input type="submit" name="submit" value="Edit " class="btn btn-primary" onClick="return validation();">
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='policy_view.php'">
                  </div>
                </div>
              </div>
            </div>
            <!-- panel -->
          </form>
        </div>
        <!-- col-md-6 --> 
      </div>
      <!--row --> 
    </div>
    <!-- contentpanel --> 
  </div>
  <!-- mainpanel --> 
  <!-- rightpanel --> 
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/jquery.prettyPhoto.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 
<script src="js/custom.js"></script> 
 
 

</body>
</html>