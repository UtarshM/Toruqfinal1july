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
$col_cdo = "SELECT * FROM customer_detail cd where cus_code_no LIKE 'CUS%' ORDER BY cd.cus_id DESC";
$result_col_cdo = $con->query( $col_cdo );
$total_records = $result_col_cdo->num_rows + 1;
$cus_code_no = "CUS" . $total_records;
// echo $cus_code_no; exit;
if ( isset( $_POST[ "submit" ] ) ) {

  /////// IMAGE UPLOAD
  if(!empty($_FILES['cus_photo']['name']))	
  {	
    // EXT VALIDATION
    $file_ext=strtolower(end(explode('.',$_FILES['cus_photo']['name'])));
    $valid_exts = array('jpg','JPG');
    if (in_array($file_ext, $valid_exts)) { 
    // echo "Valid File";
      ///// FILE EXT 
      $file_ext_img=strtolower(end(explode('.',$_FILES['cus_photo']['name'])));
      $valid_exts_img = array('jpg','JPG');
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
    header("Location: customer_add.php?&msg=erimgext");  exit;
    }
      ///// FILE EXT 
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
  $added_date = date( 'Y-m-d H:i:s' );
  $updated_date = date( 'Y-m-d H:i:s' );
  $added_by = $_SESSION[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_ins = "INSERT INTO customer_detail (branch_id, cus_code_no, cus_name, cus_contact,  cus_nickname, cus_alt, cus_email, cus_partener, cus_dob, cus_residential, cus_office, cus_native, cus_pincode, cus_business, cus_religion, cus_cast, cus_photo, cus_regno, cus_visit, added_by, updated_by, cus_status, added_date, updated_date) VALUES ('" . $branch_id . "','" . $cus_code_no . "','" . $cus_name . "','" . $cus_contact . "','".$cus_nickname."','".$cus_alt."','".$cus_email."','".$cus_partener."','".$cus_dob."','".$cus_residential."','".$cus_office."','".$cus_native."','".$cus_pincode."','".$cus_business."','".$cus_religion."','".$cus_cast."','".$cus_photo."','".$cus_regno."','".$cus_visit."','" . $added_by . "','" . $updated_by . "','" . $cus_status . "','" . $added_date . "','" . $updated_date . "')";
    // echo $sql_expe_ins; exit;
    if ( $con->query( $sql_expe_ins ) === TRUE ) {
      header( 'Location: customer_view.php?flag=1' );
    } else {
      header( 'Location: customer_add.php' );
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
<title>Add Our Customer  -<?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
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
  <h2><i class="fa fa-plus"></i> Add Our Customer </h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
      <li class="active">Add Our Customer </li>
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
            <?php if(isset($flag)==11){?>
            <p style="color:red;">This registration no. is already exists</p>
            <?php } ?>
            <?php
                if($_GET['msg']=="erimgext") {
		 						echo "<span style='color:red; font-size:14px;'>File type wrong, Please select type JPG file</span>"; } ?>
            <p>Please set customer work details here.</p>
          </div>
          <div class="panel-body">
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Our Customer Code <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="text" disabled class="form-control" value="<?php echo $cus_code_no; ?>"  />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="cus_name" class="form-control" required value="<?php echo $cus_name; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Nick Name </label>
              <div class="col-sm-9">
                <input type="text" name="cus_nickname" class="form-control" value="<?php echo $cus_nickname; ?>" placeholder="Panshu" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Sub Cast  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_cast" class="form-control" value="<?php echo $cus_cast; ?>" placeholder="Pathan" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Mobile No.  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="cus_contact" value="<?php echo $cus_contact; ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  required placeholder="9898569898" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Alt. Mobile No.</label>
              <div class="col-sm-9">
                <input type="phone" name="cus_alt" value="<?php echo $cus_alt; ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10" placeholder="9898569898" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Email </label>
              <div class="col-sm-9">
                <input type="email" name="cus_email" class="form-control" value="<?php echo $cus_email; ?>" placeholder="john@mail.com" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Partener Name  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_partener" class="form-control" value="<?php echo $cus_partener; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Date of Birth <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="cus_dob" class="form-control" required />
              </div>
            </div>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Residential Address</label>
              <div class="col-sm-9">
                <input type="text" name="cus_residential" class="form-control" value="<?php echo $cus_residential; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Office Address  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_office" class="form-control" value="<?php echo $cus_office; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Native Place  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_native" class="form-control" value="<?php echo $cus_native; ?>" placeholder="Jakirhusen Parasara" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Pincode</label>
              <div class="col-sm-9">
                <input type="phone" name="cus_pincode" value="<?php echo $cus_pincode; ?>" class="form-control" pattern="\d*" minlength="6" maxlength="6"  placeholder="380051" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Business  </label>
              <div class="col-sm-9">
                <input type="text" name="cus_business" class="form-control" value="<?php echo $cus_business; ?>" placeholder="Power Business" />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Religion <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
              <select class="form-control" name="cus_religion" required >
                  <option value="" > Select Religion   </option>
                  <option value="1" >Muslim </option>
                  <option value="2" >Non Muslim </option>
                </select>
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Vehicle Name Number  </label>
              <div class="col-sm-9">
              <textarea name="cus_regno" id="" cols="3" rows="3" class="form-control" placeholder="Honda Activa (GJ01AA1111)"><?php echo $cus_regno; ?></textarea>
             </div>
            </div>
            <div class="form-group form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Last Visit Date <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="date" name="cus_visit" class="form-control" value="<?php $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>

            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Profile Photo (Only JPG) <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
              <input type="file" name="cus_photo" id=""  class="form-control" />
              </div>
            </div>
            



            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="cus_status">
                  <?php
                  $query_status = "SELECT * FROM status_detail WHERE status_id!=3";
                  $result_status = $con->query( $query_status );
                  while ( $row_status = $result_status->fetch_object() ) {
                    ?>
                  <option <?php if ($row_status->status_id == 1) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
                  <?php } ?>
                </select>
              </div>
            </div>
            </div>
            <div class="panel-footer">
              <div class="row">
                <div class="col-sm-12 col-lg-12 col-md-12 col-xs-12 ml_15">
                  <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                  <button type="reset" class="btn btn-default">Reset </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>
</section>
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