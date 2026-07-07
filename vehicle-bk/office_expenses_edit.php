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
if ( !in_array( "10", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights

$oexp_id = $_GET[ 'oexp_id' ];

if ( isset( $_POST[ "submit" ] ) ) {
   
  $oexp_description = addslashes( $_POST[ "oexp_description" ] );
  $oexp_incexp = addslashes( $_POST[ "oexp_incexp" ] );
  $pm_id = addslashes( $_POST[ "pm_id" ] );
  $oexp_amount = addslashes( $_POST[ "oexp_amount" ] );
  $oexp_paidto = addslashes( $_POST[ "oexp_paidto" ] );
  $oexp_date = addslashes( $_POST[ "oexp_date" ] );

  if(!empty($_FILES['oexp_image']['name']))	
  {
      $img_name = $_FILES['oexp_image']['name'];
      $img_type = $_FILES['oexp_image']['type'];
      $tmp = $_FILES['oexp_image']['tmp_name'];
      $size = $_FILES['oexp_image']['size'];
      if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_FILES['oexp_image'])) {
        // get file extension
          $uploadDirectory = "img/oexp_files/";
          $fileExtensionsAllowed = ['jpeg', 'jpg', 'png']; 
          $rand_id = date("Y-m-d-H-i-s");
          $fileName = $rand_id.$_FILES['oexp_image']['name'];
          $fileName = str_replace(' ', '', $fileName);
          $fileSize = $_FILES['oexp_image']['size'];
          $fileTmpName  = $_FILES['oexp_image']['tmp_name'];
          $fileType = $_FILES['oexp_image']['type'];
          $fileExtension = strtolower(end(explode('.', $fileName)));
          // $url .
          $uploadPath =  $uploadDirectory . basename($fileName);
          if (!in_array($fileExtension, $fileExtensionsAllowed)) {
            header("Location: office_expenses_edit.php?oexp_id=".$oexp_id."&flag=4"); exit;
          }
          if ($fileSize > 3000000) {
            header("Location: office_expenses_edit.php?oexp_id=".$oexp_id."&flag=5"); exit;
          }
          $didUpload = move_uploaded_file($fileTmpName, $uploadPath);
      }
  } else {
      $fileName = $_POST[ 'hdp_oexp_image' ];
  }

  $oexp_status = addslashes( $_POST[ "oexp_status" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE office_expenses_detail SET oexp_description='" . $oexp_description . "', oexp_incexp='" . $oexp_incexp . "', pm_id='" . $pm_id . "', oexp_amount='" . $oexp_amount . "',  oexp_paidto='" . $oexp_paidto . "',  oexp_date='" . $oexp_date . "', oexp_image='" . $fileName . "',  updated_by='" . $updated_by . "', oexp_status='" . $oexp_status . "', updated_date='" . $updated_date . "' WHERE oexp_id=" . $oexp_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: office_expenses_view.php?flag=2' );
  } else {
    header( 'Location: office_expenses_edit.php?oexp_id=' . $oexp_id . '' );
  }
}

$query_state_detail = "SELECT * FROM office_expenses_detail ld where ld.oexp_id=" . $oexp_id;
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();

if($row_state->branch_id != $_SESSION['adm_branch']) {
  header( 'Location: #' );
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Office Expenses Edit   -<?php echo $meta_title; ?></title>
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
  function deleterec2(id, image) {
      if (confirm("Are you sure want to delete")) {
        window.location = "office_expenses_delete_image.php?oexp_image=" + image + "&id=" + id;
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
      <h2><i class="fa fa-pen"></i> Office Expenses Edit   </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
          <li class="active">Office Expenses Edit  </li>
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
                <h4 class="panel-title">Office Expenses Details</h4>
                <p>Please set office expenses details here</p>
                <?php if($_GET['flag']==4) {?>
                <p class="mb20" style="color:green">Type wrong</p>
                <?php } else if($_GET['flag']==5) {?>
                <p class="mb20" style="color:green">Size big</p>
                <?php } ?>
              </div>
              <div class="panel-body">
                <div class="form-group">
              <label class="col-sm-3 control-label">Receipt No.   <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->oexp_code_no; ?>"  />
              </div>
            </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="oexp_date" id="oexp_date" value="<?php $datend   = new DateTime($row_state->oexp_date); echo $datend->format('Y-m-d'); ?>" class="form-control" placeholder="Type dob..." required />
                  </div>
                </div>
                <div class="form-group">
              <label class="col-sm-3 control-label">Income/Expense <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="oexp_incexp" >
                  <option value="" > Select Income/Expense   </option>
                  <option value="1" <?php if($row_state->oexp_incexp==1) { ?>selected<?php } ?> >Income </option>
                  <option value="2" <?php if($row_state->oexp_incexp==2) { ?>selected<?php } ?>>Expense </option>
                   
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="col-sm-3 control-label">Pay Method <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="pm_id" >
                  <option value="">Select Pay Method</option>
                  <?php
                  $query_pm = "SELECT * FROM pay_method_detail WHERE pm_status=1";
                  $result_pm = $con->query( $query_pm );
                  while ( $row_pm = $result_pm->fetch_object() ) {
                    ?>
                  <option <?php if($row_state->pm_id==$row_pm->pm_id) { ?>selected<?php } ?> value="<?php echo $row_pm->pm_id ?>"> <?php echo $row_pm->pm_name ?> </option>
                  <?php } ?> 
                   
                </select>
              </div>
            </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Amount <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="number" min="0" name="oexp_amount" id="oexp_amount" value="<?php echo $row_state->oexp_amount ?>" class="form-control" placeholder="ex: 500" required />
                  </div>
                </div>
               
                
                <div class="form-group">
                  <label class="col-sm-3 control-label">Description <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" name="oexp_description" id="oexp_description" value="<?php echo $row_state->oexp_description ?>" class="form-control" placeholder="ex: Type here" required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Paid To<span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" name="oexp_paidto" id="oexp_paidto" value="<?php echo $row_state->oexp_paidto ?>" class="form-control" placeholder="ex: JOhn Doe" required />
                  </div>
                </div>
                 
                <div class="form-group">
                  <label class="col-sm-3 control-label">Documents<br>
                    </label>
                  <div class="col-sm-6">
                    <input type="file" name="oexp_image" value="<?php echo $row_state->oexp_image ?>" class="form-control"/>
                    <input type="hidden" name="hdp_oexp_image" id="hdp_oexp_image" value="<?php echo  $row_state->oexp_image ?>" />
                  </div>
                  <div class="col-sm-3">
                    <?php
                    if ( $row_state->oexp_image != '' ) {
                      ?>
                    <a href="img/oexp_files/<?php echo $row_state->oexp_image;  ?> " data-rel="prettyPhoto"> <img height="60" width="60" src="img/oexp_files/<?php echo $row_state->oexp_image;  ?>" class="img-responsive" alt="" /> </a> <a href="javascript:deleterec2('<?php echo $row_state->oexp_id ?>','<?php echo $row_state->oexp_image ?>')" class="link" style="font-size:12px">Remove</a>
                    <?php
                    } else {
                      echo "Image not available";
                    }
                    ?>
                  </div>
                </div>
                 
                <div class="form-group">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="oexp_status">
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id IN (1,2)";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if ($row_status->status_id == $row_state->oexp_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <!-- panel-body -->
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-9 col-sm-offset-3">
                    <input type="submit" name="submit" value="Edit" class="btn btn-primary" onClick="return validation();">
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='office_expenses_view.php'">
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