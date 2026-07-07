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
if ( !in_array( "16", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights

$cus_id = $_GET[ 'cus_id' ];

if ( isset( $_POST[ "submit" ] ) ) {

  /////// IMAGE UPLOAD
  if(!empty($_FILES['cus_photo']['name']))	
  {	
    // EXT VALIDATION
    $file_ext=strtolower(end(explode('.',$_FILES['cus_photo']['name'])));
    $valid_exts = array('jpg','JPG','jpeg','JPEG');
    if (in_array($file_ext, $valid_exts)) { 
    // echo "Valid File";
      ///// FILE EXT 
      $file_ext_img=strtolower(end(explode('.',$_FILES['cus_photo']['name'])));
      $valid_exts_img = array('jpg','JPG','jpeg','JPEG');
        if (in_array($file_ext_img, $valid_exts_img)) { 
          // echo "IMAGE HERE";
          ////// IMAGE UPLOAD
          if(!empty($_FILES['cus_photo']['name']))	
          {				
            // $ran1=rand(1,9999);
            $ran1 =date("d-m-y-h-i-s");
            $file_name = $_FILES['cus_photo']['name'];
            $file_tmp =$_FILES['cus_photo']['tmp_name'];
            
            $benner = $ran1.$file_name;
            move_uploaded_file($file_tmp,"img/cus_photo_file/".$benner);
          }
        } 
    } else {
    // echo " IN Valid File";
    header("Location: customer_edit.php?msg=erimgext&cus_id=".$cus_id);  exit;
    }
      ///// FILE EXT 
   } else {
      $benner = $_POST['hdp_image'];
   }
  ////// IMAGE UPLOAD

  $branch_id = $_SESSION[ 'adm_branch' ];
  $cus_name = addslashes( $_POST[ "cus_name" ] );
  $cus_contact = addslashes( $_POST[ "cus_contact" ] );
  $cus_nickname = addslashes( $_POST[ "cus_nickname" ] );
  $cus_alt = addslashes( $_POST[ "cus_alt" ] );
  $cus_email = addslashes( $_POST[ "cus_email" ] );
  $cus_partener = addslashes( $_POST[ "cus_partener" ] );
  $cus_dob = addslashes( $_POST[ "cus_dob" ] );
  $cus_residential = addslashes( $_POST[ "cus_residential" ] );
  $cus_office = addslashes( $_POST[ "cus_office" ] );
  $cus_native = addslashes( $_POST[ "cus_native" ] );
  $cus_pincode = addslashes( $_POST[ "cus_pincode" ] );
  $cus_business = addslashes( $_POST[ "cus_business" ] );
  $cus_religion = addslashes( $_POST[ "cus_religion" ] );
  $cus_cast = addslashes( $_POST[ "cus_cast" ] );
  $cus_photo = $benner;
  $cus_regno = addslashes( $_POST[ "cus_regno" ] );
  $cus_visit = addslashes( $_POST[ "cus_visit" ] );
  $cus_status = addslashes( $_POST[ "cus_status" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE customer_detail SET cus_name='" . $cus_name."', cus_contact='".$cus_contact."', cus_nickname='".$cus_nickname."', cus_alt='".$cus_alt."', cus_email='".$cus_email."', cus_partener='".$cus_partener."', cus_dob='".$cus_dob."', cus_residential='".$cus_residential."', cus_office='".$cus_office."', cus_native='".$cus_native."', cus_pincode='".$cus_pincode."', cus_business='".$cus_business."', cus_religion='".$cus_religion."', cus_cast='".$cus_cast."', cus_photo='".$cus_photo."', cus_regno='".$cus_regno."', cus_visit='".$cus_visit."',  updated_by='" . $updated_by . "', cus_status='" . $cus_status . "', updated_date='" . $updated_date . "' WHERE cus_id=" . $cus_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: customer_view.php?flag=2' ); exit;
  } else {
    header( 'Location: customer_edit.php?cus_id='.$cus_id.'' );  exit;
  }
}

$query_state_detail = "SELECT * FROM customer_detail ld where ld.cus_id=" . $cus_id." and cus_status!='3' ";
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();
if($row_state->branch_id != $_SESSION['adm_branch']) {
  header( 'Location: #' );
}
// echo "TEST"; exit;
 
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Our Customer Edit   -<?php echo $meta_title; ?></title>
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
    function deleterec1(cus_id) {
      if (confirm("Are you sure want to delete image ?")) {
        window.location = "customer_img_delete.php?cus_id=" + cus_id;
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
      <h2><i class="fa fa-pen"></i> Our Customer Edit </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
          <li class="active">Our Customer Edit </li>
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
                <h4 class="panel-title">Our Customer Details</h4>
                <?php
                if($_GET['msg']=="erimgext") {
		 						echo "<span style='color:red; font-size:14px;'>File type wrong, Please select type JPG file</span>"; } ?>
                <p>Please set customer work details here</p>
              </div>
              <div class="panel-body">
                 
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Our Customer Code <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->cus_code_no; ?>"  />
                  </div>
                </div>
                
                 
                 
                
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="cus_name" class="form-control" value="<?php echo $row_state->cus_name ?>" placeholder="Jakirhusen Parasara" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Nick Name </label>
              <div class="col-sm-9">
                <input type="text" name="cus_nickname" class="form-control" value="<?php echo $row_state->nickname; ?>" placeholder="Panshu" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Sub Cast  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_cast" class="form-control" value="<?php echo $row_state->cast; ?>" placeholder="Pathan" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Mobile No.  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="cus_contact" value="<?php echo $row_state->cus_contact ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  required placeholder="9898569898" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Alt. Mobile No.</label>
              <div class="col-sm-9">
                <input type="phone" name="cus_alt" value="<?php echo $row_state->cus_alt; ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  placeholder="9898569898" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Email </label>
              <div class="col-sm-9">
                <input type="email" name="cus_email" class="form-control" value="<?php echo $row_state->email; ?>" placeholder="john@mail.com" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Partener Name  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_partener" class="form-control" value="<?php echo $row_state->partener; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Date of Birth <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="cus_dob" class="form-control" required value="<?php $datend   = new DateTime($row_state->cus_dob); echo $datend->format('Y-m-d'); ?>" />
              </div>
            </div>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Residential Address</label>
              <div class="col-sm-9">
                <input type="text" name="cus_residential" class="form-control" value="<?php echo $row_state->residential; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Office Address  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_office" class="form-control" value="<?php echo $row_state->office; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Native Place  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_native" class="form-control" value="<?php echo $row_state->native; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Pincode</label>
              <div class="col-sm-9">
                <input type="phone" name="cus_pincode" value="<?php echo $row_state->pincode; ?>" class="form-control" pattern="\d*" minlength="6" maxlength="6"  placeholder="380051" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Business  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_business" class="form-control" value="<?php echo $row_state->business; ?>" placeholder="Power Business" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Religion  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
              <select class="form-control" name="cus_religion" required >
                  <option value="" > Select Religion   </option>
                  <option value="1" <?php if($row_state->cus_religion==1) { echo"selected"; } ?> >Muslim </option>
                  <option value="2" <?php if($row_state->cus_religion==2) { echo"selected"; } ?> >Non Muslim </option>
                </select>
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Vehicle Name Number  </label>
              <div class="col-sm-9">
                <textarea name="cus_regno" id="" cols="3" rows="3" class="form-control" placeholder="Honda Activa (GJ01AA1111)"><?php echo $row_state->cus_regno; ?></textarea>
               </div>
            </div>
            <div class="form-group form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Last Visit Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="cus_visit" class="form-control" value="<?php $datend   = new DateTime($row_state->cus_visit); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>

           

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                    <label class="col-sm-3 control-label">Profile Photo (Only JPG)</label>
                    <div class="col-sm-4">
                      <input type="file" name="cus_photo" value="<?php echo $row_state->cus_photo ?>" class="form-control" />
                      <input type="hidden" name="hdp_image" id="hdp_image" value="<?php echo  $row_state->cus_photo ?>" />
                    </div>
                    <div class="col-sm-5">
                      <?php if ($row_state->cus_photo != '') {

                      ?>
                      <a href="img/cus_photo_file/<?php  echo $row_state->cus_photo; ?>"  data-rel="prettyPhoto"> <img style="margin-bottom: 5px;" width="100px" src="img/cus_photo_file/<?php  echo $row_state->cus_photo; ?>" class="img-responsive"></a>

                         
                        <a href="javascript:deleterec1('<?php echo $row_state->cus_id ?>')" class="link" style="font-size:12px">Remove</a>
                      <?php

                      } else {

                        echo "JPG not available";
                      }

                      ?>
                    </div>
                  </div>
           

          

              
            

            


            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="cus_status" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?>>
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id!=3";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if ($row_status->status_id == $row_state->cus_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
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
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='customer_view.php'">
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

<script>
  jQuery(document).ready(function(){
    jQuery("a[data-rel^='prettyPhoto']").prettyPhoto();
  });
</script> 
</body>
</html>