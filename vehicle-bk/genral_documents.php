<?php
	include("ka_include/session.php");
	include("ka_include/common_function.php");
	include("ka_include/ka_config.php");
 	include("ka_include/check_admin_login.php");
	 if ( $_SESSION[ 'adm_type' ] != 0 ) {
		header( 'Location: #' );
	  }
	$gen_id = 1;
	 
	
	// echo "Test"; exit;
 	$total_document_detail = "SELECT * FROM status_detail st, document_detail sd  where sd.document_status=st.status_id and sd.document_status!='3' and sd.gen_id=".$gen_id." ORDER BY sd.document_id";
	$result_tot = $con->query($total_document_detail);
	$total_rec_gal=$result_tot->num_rows;
	// echo $total_records; exit;
	$query_document_rec = "SELECT * FROM status_detail st, document_detail sd  where sd.document_status=st.status_id and sd.document_status!='3' and sd.gen_id=".$gen_id."  ORDER BY sd.document_id";
	if(isset($_POST["submit"]))
	{
 		$document_title = addslashes($_POST["document_title"]);
		$document_image = addslashes($_POST["document_image"]);


		/////// IMAGE UPLOAD
		if(!empty($_FILES['document_image']['name']))	
		{	
			// EXT VALIDATION
			$file_ext=strtolower(end(explode('.',$_FILES['document_image']['name'])));
			$valid_exts = array('jpg','png','jpeg','JPG','PNG','JPEG','pdf','PDF');
			if (in_array($file_ext, $valid_exts)) { 
			// echo "Valid File";
				///// FILE EXT 
				$file_ext_img=strtolower(end(explode('.',$_FILES['document_image']['name'])));
				$valid_exts_img = array('jpg','png','jpeg','JPG','PNG','JPEG','pdf','PDF');
					if (in_array($file_ext_img, $valid_exts_img)) { 
						// echo "IMAGE HERE";
						////// IMAGE UPLOAD
						if(!empty($_FILES['document_image']['name']))	
						{				
							// $ran1=rand(1,9999);
							$ran1 =date("d-m-y-h-i-s");
							$file_name = $_FILES['document_image']['name'];
							$file_tmp =$_FILES['document_image']['tmp_name'];
							
							$benner = $ran1.$file_name;
							move_uploaded_file($file_tmp,"img/document_files/".$benner);

							$added_by=$_SESSION['adm_id'];
							$updated_by=$_SESSION['adm_id'];
							$added_date = date("Y-m-d H:i:s");
							$updated_date = date("Y-m-d H:i:s");
							$sql_document_ins = "INSERT INTO document_detail (document_title, document_image, gen_id,  added_by, updated_by, document_status, added_date, updated_date) VALUES ('".$document_title."','".$benner."','".$gen_id."','".$added_by."','".$updated_by."','1','".$added_date."','".$updated_date."')";
							$con->query($sql_document_ins);
						}
						
						 
					} 
			} else {
			// echo " IN Valid File";
			header("Location: genral_documents.php?gen_id=1&msg=erimgext");  exit;
				 
			}
				///// FILE EXT 
 		}
    
 		header('Location: genral_documents.php?flag=1&gen_id='.$gen_id);
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
<title>Documents -
<?php  echo  "Genral Documents" ?>
<?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<link href="css/prettyPhoto.css" rel="stylesheet">
<script src="Text/ckeditor.js"></script> 
<script src="Text/samples/js/sample.js"></script>
<link rel="stylesheet" href="Text/samples/css/samples.css">
<link rel="stylesheet" href="Text/samples/toolbarconfigurator/lib/codemirror/neo.css">
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
    <?php include("left-column.php");?>
    <!-- leftpanelinner --> 
  </div>
  <!-- leftpanel -->
  <div class="mainpanel">
    <?php include("header.php");?>
    <div class="pageheader">
      <h2><i class="fa fa-plus"></i> Documents -
        <?php  echo  "Genral Documents" ?>
      </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a href="insurance_dashboard.php">Dashboard</a></li>
          <li><a href="genral_view.php">Renewal List </a></li>
          <li class="active">Documents -
            <?php  echo  "Genral Documents" ?>
          </li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="row">
        <div class="col-md-12">
          <form method="post"  name="frmadmin_changepwd" id="" class="" action="" enctype="multipart/form-data" >
            <div class="panel panel-default">
              <div class="panel-heading">
                <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
                <h4 class="panel-title">Documents -
                  <?php  echo  "Genral Documents" ?>
                </h4>
				<?php
			if($_GET['msg']=="erimgext") {
		 						echo "<span style='color:red; font-size:14px;'>File type wrong, Please select type PDF file</span>";
			}
			
			 ?>
                <p>Please set documents details here.</p>
              </div>
              <div class="panel-body">
                <?php 
		  if(isset($_GET['flag']))
		  {
		  ?>
                <?php if($_GET['flag']==1) {?>
                <p class="mb20" style="color:green">Documents added successfully.</p>
                <?php } else if($_GET['flag']==2) {?>
                <p class="mb20" style="color:green">Documents updated successfully.</p>
                <?php } else if($_GET['flag']==3) {?>
                <p class="mb20" style="color:green">Documents deleted successfully.</p>
                <?php } else if($_GET['flag']==4) {?>
                <p class="mb20" style="color:red">Documents type is wrong.</p>
                <?php } else if($_GET['flag']==5) {?>
                <p class="mb20" style="color:red">Documents size is big.</p>
                <?php } ?>
                <?php } ?>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Title </label>
                  <div class="col-sm-9">
                    <input type="text" name="document_title" id="document_title" class="form-control" placeholder="Title ..." />
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-sm-3 control-label">Documents (JPG, PNG, PDF) <span class="asterisk">*</span> </label>
                  <div class="col-sm-9">
                    <input type="file" name="document_image" id=""  class="form-control" required />
                  </div>
                </div>
              </div>
              <!-- panel-body -->
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-9 col-sm-offset-3">
                    <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                    <button type="reset" class="btn btn-default">Reset</button>
                  </div>
                  <br>
                  <br>
                  <br>
                  <div style="margin-left:15px;">
                    <h2>Documents   -
                      <?php  echo  "Genral Documents" ?>
                    </h2>
                  </div>
                  <br>
                </div>
                <?php
				if($total_rec_gal!=0)
				{
						$i=0;  
						$result = $con->query($query_document_rec);
				while($gallery=$result->fetch_object())
				{ 
					
					$extension = pathinfo($gallery->document_image, PATHINFO_EXTENSION);
					if($extension=="pdf") {
						 

					
					?>
                <div class="col-sm-2" style="border: 1px solid #ddd;">
                  <iframe src="img/document_files/<?php  echo $gallery->document_image; ?>" width="100%" height="200px"></iframe>
                  <a style="color:red" onClick="return confirm('Are you sure want to delete?')"  href="genral_document_delete.php?document_id=<?php echo  $gallery->document_id; ?>&gen_id=<?php echo $gen_id; ?> " class="link" style="font-size:12px"><i class="fa fa-trash"></i></a> </div>
                <?php } else { ?>
                <div class="col-sm-2" style="border: 1px solid #ddd;"> <a href="img/document_files/<?php  echo $gallery->document_image; ?>"  data-rel="prettyPhoto"> <img style="margin-bottom: 5px;" src="img/document_files/<?php  echo $gallery->document_image; ?>" class="img-responsive"></a>
                  <?php  echo $gallery->document_title; ?>
                  <br>
                  <a style="color:red" onClick="return confirm('Are you sure want to delete?')"  href="genral_document_delete.php?document_id=<?php echo  $gallery->document_id; ?>&gen_id=<?php echo $gen_id; ?> " class="link" style="font-size:12px"><i class="fa fa-trash"></i></a> <br>
                  <br>
                </div>
                <?php } ?>
                <?php
			  }
			  }
			  ?>
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
<script src="js/jquery.prettyPhoto.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 
<script src="js/ckeditor/ckeditor.js"></script> 
<script src="js/ckeditor/adapters/jquery.js"></script> 
<script src="js/custom.js"></script> 
<script>
  jQuery(document).ready(function(){
	
	"use strict";
	
	jQuery('.thmb').hover(function(){
	  var t = jQuery(this);
	  t.find('.ckbox').show();
	  t.find('.fm-group').show();
	}, function() {
	  var t = jQuery(this);
	  if(!t.closest('.thmb').hasClass('checked')) {
		t.find('.ckbox').hide();
		t.find('.fm-group').hide();
	  }
	});
	
	jQuery('.ckbox').each(function(){
	  var t = jQuery(this);
	  var parent = t.parent();
	  if(t.find('input').is(':checked')) {
		t.show();
		parent.find('.fm-group').show();
		parent.addClass('checked');
	  }
	});
	
	
	jQuery('.ckbox').click(function(){
	  var t = jQuery(this);
	  if(!t.find('input').is(':checked')) {
		t.closest('.thmb').removeClass('checked');
		enable_itemopt(false);
	  } else {
		t.closest('.thmb').addClass('checked');
		enable_itemopt(true);
	  }
	});
	
	jQuery('#selectall').click(function(){
	  if(jQuery(this).is(':checked')) {
		jQuery('.thmb').each(function(){
		  jQuery(this).find('input').attr('checked',true);
		  jQuery(this).addClass('checked');
		  jQuery(this).find('.ckbox, .fm-group').show();
		});
		enable_itemopt(true);
	  } else {
		jQuery('.thmb').each(function(){
		  jQuery(this).find('input').attr('checked',false);
		  jQuery(this).removeClass('checked');
		  jQuery(this).find('.ckbox, .fm-group').hide();
		});
		enable_itemopt(false);
	  }
	});
	
	function enable_itemopt(enable) {
	  if(enable) {
		jQuery('.itemopt').removeClass('disabled');
	  } else {
		
		// check all thumbs if no remaining checks
		// before we can disabled the options
		var ch = false;
		jQuery('.thmb').each(function(){
		  if(jQuery(this).hasClass('checked'))
			ch = true;
		});
		
		if(!ch)
		  jQuery('.itemopt').addClass('disabled');
	  }
	}
	
	jQuery("a[data-rel^='prettyPhoto']").prettyPhoto();
	
  });
  
</script> 
<script>
	initSample();
</script>
</body>
</html>
