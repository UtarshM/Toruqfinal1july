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

$insr_id = $_GET[ 'insr_id' ];

if ( isset( $_POST[ "submit" ] ) ) {

  // /////// IMAGE UPLOAD
  // if(!empty($_FILES['insr_pdf']['name']))	
  // {	
  //   // EXT VALIDATION
  //   $file_ext=strtolower(end(explode('.',$_FILES['insr_pdf']['name'])));
  //   $valid_exts = array('pdf','PDF');
  //   if (in_array($file_ext, $valid_exts)) { 
  //   // echo "Valid File";
  //     ///// FILE EXT 
  //     $file_ext_img=strtolower(end(explode('.',$_FILES['insr_pdf']['name'])));
  //     $valid_exts_img = array('pdf','PDF');
  //       if (in_array($file_ext_img, $valid_exts_img)) { 
  //         // echo "IMAGE HERE";
  //         ////// IMAGE UPLOAD
  //         if(!empty($_FILES['insr_pdf']['name']))	
  //         {				
  //           // $ran1=rand(1,9999);
  //           $ran1 =date("d-m-y-h-i-s");
  //           $file_name = $_FILES['insr_pdf']['name'];
  //           $file_tmp =$_FILES['insr_pdf']['tmp_name'];
            
  //           $benner = $ran1.$file_name;
  //           move_uploaded_file($file_tmp,"img/ins_pdf_file/".$benner);
  //         }
  //       } 
  //   } else {
  //   // echo " IN Valid File";
  //   header("Location: insurance_guide_edit.php?msg=erimgext&insr_id=".$insr_id);  exit;
  //   }
  //     ///// FILE EXT 
  //  } else {
  //     $benner = $_POST['hdp_image'];
  //  }
  // ////// IMAGE UPLOAD

  /////// IMAGE UPLOAD
  if (!empty($_FILES['insr_pdf']['name'])) {	

      // EXT VALIDATION
      $file_ext = strtolower(pathinfo($_FILES['insr_pdf']['name'], PATHINFO_EXTENSION));
      $valid_exts = array('jpg', 'jpeg', 'png');

      if (in_array($file_ext, $valid_exts)) {

          // Generate unique name
          $ran1 = date("d-m-y-h-i-s");
          $file_name = $_FILES['insr_pdf']['name'];
          $file_tmp = $_FILES['insr_pdf']['tmp_name'];

          $benner = $ran1 . '-' . $file_name;
          move_uploaded_file($file_tmp, "img/ins_pdf_file/" . $benner);

      } else {
          // Invalid file extension
          header("Location: insurance_guide_edit.php?msg=erimgext&insr_id=" . $insr_id);
          exit;
      }

  } else {
      // No new file uploaded, use existing one
      $benner = $_POST['hdp_image'];
  }
  /////// IMAGE UPLOAD

  $branch_id = $_SESSION[ 'adm_branch' ];
  $insr_date = addslashes( $_POST[ "insr_date" ] );
  $insr_name = addslashes( $_POST[ "insr_name" ] );
  $insr_regno = addslashes( $_POST[ "insr_regno" ] );
  $insr_pdf = $benner;
  $insr_status = addslashes( $_POST[ "insr_status" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE insurance_guide_detail SET insr_date='" . $insr_date . "', insr_regno='" . $insr_regno."', insr_pdf='" . $insr_pdf."', insr_name='" . $insr_name."', updated_by='" . $updated_by . "', insr_status='" . $insr_status . "', updated_date='" . $updated_date . "' WHERE insr_id=" . $insr_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: insurance_guide_view.php?flag=2' ); exit;
  } else {
    header( 'Location: insurance_guide_edit.php?insr_id='.$insr_id.'' );  exit;
  }
}

$query_state_detail = "SELECT * FROM insurance_guide_detail ld where ld.insr_id=" . $insr_id." and insr_status!='3' ";
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
<title>Policy Check Form Edit   -<?php echo $meta_title; ?></title>
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
    function deleterec1(insr_id) {
      if (confirm("Are you sure want to delete pdf ?")) {
        window.location = "insurance_guide_pdf_delete.php?insr_id=" + insr_id;
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
      <h2><i class="fa fa-pen"></i> Policy Check Form Edit </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
          <li class="active">Policy Check Form Edit </li>
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
                <h4 class="panel-title">Policy Check Form Details</h4>
                <p>Please set insurance details here</p>
                <?php
                if ($_GET['msg'] == "erimgext") {
                  echo "<span style='color:red; font-size:14px;'>File type wrong, Please select only JPG</span>";
                }
                ?>
              </div>
              <div class="panel-body">
                 
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Policy Check Form Code <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->insr_code_no; ?>"  />
                  </div>
                </div>
                
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="insr_date" id="insr_date" value="<?php $datend   = new DateTime($row_state->insr_date); echo $datend->format('Y-m-d'); ?>" class="form-control" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
                  </div>
                </div>
                 
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Reg No.  <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="insr_regno" class="form-control" value="<?php echo $row_state->insr_regno ?>" placeholder="GJ01AJ5896" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                    <label class="col-sm-3 control-label">Policy Check Form JPG (Only JPG) <span class="asterisk">*</span></label>
                    <div class="col-sm-4">
                      <input type="file" name="insr_pdf" <?php if ($row_state->insr_pdf == "") { ?>required<?php  } ?> value="<?php echo $row_state->insr_pdf ?>" class="form-control" />
                      <input type="hidden" name="hdp_image" id="hdp_image" value="<?php echo  $row_state->insr_pdf ?>" />
                    </div>
                    <div class="col-sm-5">
                      <?php if ($row_state->insr_pdf != '') {

                      ?>
                        <!-- <iframe src="img/ins_pdf_file/<?php  echo $row_state->insr_pdf; ?>" width="100%" height="200px"></iframe> -->
                         <img src="img/ins_pdf_file/<?php echo $row_state->insr_pdf; ?>" alt="Uploaded Image" width="100%" style="max-height: 300px; object-fit: contain;">
                        
                        <a href="javascript:deleterec1('<?php echo $row_state->insr_id ?>')" class="link" style="font-size:12px">Remove</a>
                      <?php

                      } else {

                        echo "JPG not available";
                      }

                      ?>
                    </div>
                  </div>

                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="insr_name" class="form-control" value="<?php echo $row_state->insr_name ?>" placeholder="Jakirhusen Parasara" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
             

             


            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="insr_status" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?>>
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id!=3";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if ($row_status->status_id == $row_state->insr_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
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
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='insurance_guide_view.php'">
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