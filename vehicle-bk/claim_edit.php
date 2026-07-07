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
if ( !in_array( "8", $md_right ) ) {
  header( 'Location: insurance_dashboard.php' );
}
// Check Module Rights

$clm_id = $_GET[ 'clm_id' ];

if ( isset( $_POST[ "submit" ] ) ) {

  /////// IMAGE UPLOAD
  if(!empty($_FILES['clm_pdf']['name']))	
  {	
    // EXT VALIDATION
    $file_ext=strtolower(end(explode('.',$_FILES['clm_pdf']['name'])));
    $valid_exts = array('pdf','PDF');
    if (in_array($file_ext, $valid_exts)) { 
    // echo "Valid File";
      ///// FILE EXT 
      $file_ext_img=strtolower(end(explode('.',$_FILES['clm_pdf']['name'])));
      $valid_exts_img = array('pdf','PDF');
        if (in_array($file_ext_img, $valid_exts_img)) { 
          // echo "IMAGE HERE";
          ////// IMAGE UPLOAD
          if(!empty($_FILES['clm_pdf']['name']))	
          {				
            // $ran1=rand(1,9999);
            $ran1 =date("d-m-y-h-i-s");
            $file_name = $_FILES['clm_pdf']['name'];
            $file_tmp =$_FILES['clm_pdf']['tmp_name'];
            
            $benner = $ran1.$file_name;
            move_uploaded_file($file_tmp,"img/clm_pdf_file/".$benner);
          }
        } 
    } else {
    // echo " IN Valid File";
    header("Location: claim_edit.php?msg=erimgext&clm_id=".$clm_id);  exit;
    }
      ///// FILE EXT 
   } else {
      $benner = $_POST['hdp_image'];
   }
  ////// IMAGE UPLOAD

  $branch_id = $_SESSION[ 'adm_branch' ];
  $clm_adm_id = addslashes( $_POST[ "clm_adm_id" ] );
  $clm_date = addslashes( $_POST[ "clm_date" ] );
  $clm_accident = addslashes( $_POST[ "clm_accident" ] );
  $clm_name = addslashes( $_POST[ "clm_name" ] );
  $clm_no = addslashes( $_POST[ "clm_no" ] );
  $clm_amount = addslashes( $_POST[ "clm_amount" ] );
  $clm_regno = addslashes( $_POST[ "clm_regno" ] );
  $clm_pdf = $benner;
  $clm_contact = addslashes( $_POST[ "clm_contact" ] );
   
  $clm_description = addslashes( $_POST[ "clm_description" ] ); 
  $clm_status = addslashes( $_POST[ "clm_status" ] );
  $clm_action = addslashes( $_POST[ "clm_action" ] );
  $clm_stage_no = addslashes( $_POST[ "clm_stage_no" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE claim_detail SET clm_adm_id='" . $clm_adm_id . "', clm_date='" . $clm_date . "', clm_accident='" . $clm_accident . "', clm_no='" . $clm_no."', clm_amount='" . $clm_amount."', clm_regno='" . $clm_regno."', clm_pdf='" . $clm_pdf."', clm_name='" . $clm_name."', clm_contact='".$clm_contact."', clm_description='".$clm_description."', updated_by='" . $updated_by . "', clm_status='" . $clm_status . "', clm_action='" . $clm_action . "', clm_stage_no='" . $clm_stage_no . "', updated_date='" . $updated_date . "' WHERE clm_id=" . $clm_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: claim_view.php?flag=2' ); exit;
  } else {
    header( 'Location: claim_edit.php?clm_id='.$clm_id.'' );  exit;
  }
}

$query_state_detail = "SELECT * FROM claim_detail ld where ld.clm_id=" . $clm_id." and clm_status!='3' ";
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();
if($row_state->branch_id != $_SESSION['adm_branch']) {
  header( 'Location: insurance_dashboard.php' );
}
if ( $_SESSION[ 'adm_type' ] != 0 ) { 
if($row_state->clm_adm_id != $_SESSION['adm_id']) {
  header( 'Location: insurance_dashboard.php' );
}
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Claim Edit   -<?php echo $meta_title; ?></title>
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
    function deleterec1(clm_id) {
      if (confirm("Are you sure want to delete pdf ?")) {
        window.location = "claim_pdf_delete.php?clm_id=" + clm_id;
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
      <h2><i class="fa fa-pen"></i> Claim Edit </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
          <li class="active">Claim Edit </li>
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
                <h4 class="panel-title">Claim Details</h4>
                <p>Please set claim work details here</p>
                <?php
                if ($_GET['msg'] == "erimgext") {
                  echo "<span style='color:red; font-size:14px;'>File type wrong, Please select only PDF</span>";
                }
                ?>
              </div>
              <div class="panel-body">
                 
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Claim Code <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->clm_code_no; ?>"  />
                  </div>
                </div>
                
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="clm_date" id="clm_date" value="<?php $datend   = new DateTime($row_state->clm_date); echo $datend->format('Y-m-d'); ?>" class="form-control" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Accident Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="clm_accident" id="clm_accident" value="<?php $datend   = new DateTime($row_state->clm_accident); echo $datend->format('Y-m-d'); ?>" class="form-control" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
                  </div>
                </div>
                
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Claim No <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="clm_no" class="form-control" value="<?php echo $row_state->clm_no ?>" placeholder="CLAIM001" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Amount <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="number" name="clm_amount" class="form-control" value="<?php echo $row_state->clm_amount ?>" placeholder="50000" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Reg No.  <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="clm_regno" class="form-control" value="<?php echo $row_state->clm_regno ?>" placeholder="GJ01AJ5896" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                    <label class="col-sm-3 control-label">Policy PDF (Only PDF) <span class="asterisk">*</span></label>
                    <div class="col-sm-4">
                      <input type="file" name="clm_pdf" <?php if ($row_state->clm_pdf == "") { ?>required<?php  } ?> value="<?php echo $row_state->clm_pdf ?>" class="form-control" />
                      <input type="hidden" name="hdp_image" id="hdp_image" value="<?php echo  $row_state->clm_pdf ?>" />
                    </div>
                    <div class="col-sm-5">
                      <?php if ($row_state->clm_pdf != '') {

                      ?>
                        <iframe src="img/clm_pdf_file/<?php  echo $row_state->clm_pdf; ?>" width="100%" height="200px"></iframe>
                        
                        <a href="javascript:deleterec1('<?php echo $row_state->clm_id ?>')" class="link" style="font-size:12px">Remove</a>
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
                <input type="text" name="clm_name" class="form-control" value="<?php echo $row_state->clm_name ?>" placeholder="Jakirhusen Parasara" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Mobile No.  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="clm_contact" value="<?php echo $row_state->clm_contact ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  required placeholder="9898569898" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
             
           <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Task Description <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <textarea name="clm_description" class="form-control" cols="30" rows="2" placeholder="ex: Type description..." required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?>><?php echo $row_state->clm_description ?></textarea>                 
              </div>
            </div>

           <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Staff</label>
                  <div class="col-sm-9">
                    <select class="form-control" name="clm_adm_id" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?>>
                      <option value="" >Select Staff</option>
                       <?php
                      $query_admin = "SELECT * FROM admin_login WHERE adm_status=1 and adm_id!=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                      $result_admin = $con->query( $query_admin );
                      while ( $row_admin = $result_admin->fetch_object() ) {
                        ?>
                      <option value="<?php echo $row_admin->adm_id?>" <?php if ($row_admin->adm_id==$row_state->clm_adm_id) { ?>selected<?php } ?> > <?php echo $row_admin->adm_username?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>

                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="clm_action">
                  <option value="">Select Action</option>
                  <option value="1" <?php if ($row_state->clm_action == 1) { ?>selected<?php } ?>>Pending</option>
                  <option value="2" <?php if ($row_state->clm_action == 2) { ?>selected<?php } ?>>Settled</option>
                  <option value="3" <?php if ($row_state->clm_action == 3) { ?>selected<?php } ?>>Partially Settled</option>
                  <option value="4" <?php if ($row_state->clm_action == 4) { ?>selected<?php } ?>>Rejected</option>
                </select>
              </div>
            </div>
             

              <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Stage <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select class="form-control" name="clm_stage_no" required>
                  <option value="">Select Stage</option>
                  <option value="1" <?php if($row_state->clm_stage_no==1) {?>selected<?php } ?>>Intimation</option>
                  <option value="2" <?php if($row_state->clm_stage_no==2) {?>selected<?php } ?>>Survey</option>
                  <option value="3" <?php if($row_state->clm_stage_no==3) {?>selected<?php } ?>>Estimate</option>
                  <option value="4" <?php if($row_state->clm_stage_no==4) {?>selected<?php } ?>>Approval</option>
                  <option value="5" <?php if($row_state->clm_stage_no==5) {?>selected<?php } ?>>Delivery</option>
                  <option value="6" <?php if($row_state->clm_stage_no==6) {?>selected<?php } ?>>Payment Credited</option>
                 </select>
              </div>
              
            </div>


            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="clm_status" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?>>
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id!=3";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if ($row_status->status_id == $row_state->clm_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
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
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='claim_view.php'">
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