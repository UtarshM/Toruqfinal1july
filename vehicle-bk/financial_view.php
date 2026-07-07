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
  header( 'Location: #' );
}
// Check Module Rights

$date = new DateTime('now');
//$to_da = $date->format('Y-m-d');

// $date->modify('first day of this month');
$to_da = $date->format('Y-04-01');

$nx_y = $date->format('Y')+1;

$date->modify('last day of this month');
$la_da = $nx_y."-".$date->format('03-31');

// echo $la_da; exit;

 

$query_expe_tot = "SELECT * FROM collection_detail td where  td.collection_incexp IN(1,2) and td.collection_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.collection_status IN (1,2) and Date(td.collection_date) >= '$to_da' and Date(td.collection_date) <= '$la_da' ORDER BY td.collection_id";
$result_tot = $con->query( $query_expe_tot );
$total_records = $result_tot->num_rows;
// echo $total_records; exit;

$query_expe = "SELECT * FROM collection_detail td  where td.collection_incexp IN(1,2) and td.collection_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.collection_status IN (1,2) and Date(td.collection_date) >= '$to_da' and Date(td.collection_date) <= '$la_da'  ORDER BY td.collection_id";

  $query_income = "SELECT SUM(collection_amount) as total_income FROM collection_detail td where td.collection_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.collection_incexp=1 and Date(td.collection_date) >= '$to_da' and Date(td.collection_date) <= '$la_da'";
	$result_income = $con->query( $query_income );
	$row_income = $result_income->fetch_object();
	$final_income = $row_income->total_income;

	$query_expense = "SELECT SUM(collection_amount) as total_expense FROM collection_detail td where td.collection_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.collection_incexp=2 and Date(td.collection_date) >= '$to_da' and Date(td.collection_date) <= '$la_da'";
	$result_expense = $con->query( $query_expense );
	$row_expense = $result_expense->fetch_object();
	$final_expense = $row_expense->total_expense;

 
$final_balance = $final_income-$final_expense;


// SELECT SUM(score) as sum_score FROM game;

if ($_POST["submit_report"] != "") {
  $strdate = $_POST['strdate'];
  $enddate = $_POST['enddate'];
  $strdate = date("Y-m-d", strtotime($strdate));
  $enddate = date("Y-m-d", strtotime($enddate));
	header( 'Location: financial_export.php?strdate=' . $strdate . '&enddate=' . $enddate);
}


?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Financial Report List   - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<link href="css/prettyPhoto.css" rel="stylesheet">
 
  
<script src="js/jquery-1.11.1.min.js"></script> 
<!--<script src="js/new-jquery-3.3.1.js"></script>--> 
<script src="js/new-table.js"></script>
<link href="css/new-table.css" rel="stylesheet">

<script type="text/javascript">
$(document).ready(function() {
    // Setup - add a text input to each footer cell
    $('#example tfoot th').each( function () {
        var title = $(this).text();
        $(this).html( '<input type="text" placeholder="'+title+'" />' );
    } );
 
    // DataTable
    var table = $('#example').DataTable();
 
    // Apply the search
    table.columns().every( function () {
        var that = this;
 
        $( 'input', this.footer() ).on( 'keyup change', function () {
            if ( that.search() !== this.value ) {
                that
                    .search( this.value )
                    .draw();
            }
        } );
    } );
} );
</script>

<style>
tfoot input {
    width: 100%;
    padding: 3px;
    box-sizing: border-box;
}
</style>
<?php if (isset($_GET['msg'])) { ?>
<?php if ($_GET['msg'] == "empty") { ?>
<?php if ($_GET['strdate'] != "") {
        $std = $_GET['strdate'];
      } ?>
<?php if ($_GET['enddate'] != "") {
        $edd = $_GET['enddate'];
      } ?>
<script>
        alert("No record found");
      </script>
<?php }
  } ?>
</head>
<body>
  
<!-- Preloader -->
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>

<section>
  <?php include("left-column.php");?>
  
  <div class="mainpanel">
    <?php include("header.php");?>
    <div class="pageheader">
      <h2><i class="fa fa-table"></i> Financial Report List   </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
          <li class="active">Financial Report List  </li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="panel panel-default">
        <div class="panel-body">
          <?php 
          if ( isset( $_GET[ 'flag' ] ) ) {
            ?>
          <?php if($_GET['flag']==1) {?>
          <p class="mb20" style="color:green">Financial Report details added successfully.</p>
          <?php } else if($_GET['flag']==2) {?>
          <p class="mb20" style="color:green">Financial Report details updated successfully.</p>
          <?php } else if($_GET['flag']==3) {?>
          <p class="mb20" style="color:green">Financial Report details deleted successfully.</p>
          <?php } ?>
          <?php } ?>
          <div class="col-md-12" style="margin:0px 0px 20px 0px;">

         
            <div class="col-md-9">
              <form class="form-horizontal" method="post" action="">
                <div class="col-md-2"> <span> From Date:&nbsp;  </span>
                  <input style="line-height:20px;" readonly class="form-control" required name="strdate" type="date" value="<?php if ($std != "") { $datend2   = new DateTime($std); echo $datend2->format('Y-m-d'); } else if($_POST['strdate']!="") { echo $_POST['strdate'];} else { $datend2   = new DateTime($to_da); echo $datend2->format('Y-m-d'); }  ?>" placeholder="Select Date" />
                </div>
                <div class="col-md-2"> <span>To Date:&nbsp;</span>
                  <input style="line-height:20px;" class="form-control" required name="enddate" type="date" value="<?php if ($edd != "") { $datend3   = new DateTime($edd); echo $datend3->format('Y-m-d'); } else if($_POST['enddate']!="") { echo $_POST['enddate'];} else { $datend2   = new DateTime($la_da); echo $datend2->format('Y-m-d'); }   ?>" readonly placeholder="Select Date" />
                </div>
                 
              
                <div class="col-md-3"> <span>&nbsp;</span>
                  <input class="btn btn-primary form-control" type="submit" name="submit_report" value="Download Financial Report" />
                </div>
                
              </form>
            </div>
          </div>
          <h4 class="text-center"> 
            <span style="color: green;">Income : <b><?php echo "&#8377;".number_format($final_income,2); ?></b></span> - <span style="color: red;">Expense : <b><?php echo "&#8377;".number_format($final_expense,2); ?></b></span> = <span style="color: blue;">Balance : <b><?php echo "&#8377;".number_format($final_balance,2); ?></b></span> 
          </h4>
          <div class="table-responsive"> 
             
            <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
              <thead bgcolor="#82c21f">
                <tr>
                  <th  width="5%">ID</th>
                  <th  width="5%">No.</th>
                  <th  width="10%">Date</th> 
                  <th width="35%">Description</th>
                  <th width="15%">Amount</th>
                  
                  <th  width="10%">Type</th> 
                 </tr>
              </thead>
              <tbody>
                <?php
                if ( $total_records != 0 ) {
                  $i = 0;
                  ?>
                <?php
                $result = $con->query( $query_expe );
                while ( $row_state = $result->fetch_object() ) {
                  ?>
                <tr class="odd gradeX" style="background-color: <?php if($row_state->collection_incexp==1) { ?>#E7F1E8<?php } else { ?>#FFD5D4<?php } ?> !important;">
                  <td ><?php echo $row_state->collection_id;?></td>
                  <td ><?php echo $row_state->collection_code_no;?></td>
                  <td ><?php
                  $datend = new DateTime( $row_state->collection_date );
                  echo $datend->format( 'D, d-m-Y' );
                  ?></td>
                  <td><?php echo $row_state->collection_name;?></td>
                  <td><?php echo "&#8377;".number_format($row_state->collection_amount,2);?></td>
                  
                   
                  <td ><?php if($row_state->collection_incexp==1) {  echo "Income"; } elseif($row_state->collection_incexp==2) { echo "Expense"; } ?></td>
                 </tr>
                <?php }} ?>
              </tbody>
              <tfoot>
                <tr>
                  <th width="5%" width="8%">ID</th>
                  <th width="5%" width="8%">No.</th>
                  <th width="10%">Date</th>
                  <th width="35%">Description</th>
                  <th width="15%">Amount</th>
                  
                  <th  width="10%">Type</th>
                 </tr>
              </tfoot>
            </table>
          </div>
          <!-- table-responsive --> 
        </div>
        <!-- panel-body --> 
      </div>
      <!-- panel --> 
    </div>
    <!-- contentpanel --> 
  </div>
  <!-- mainpanel --> 
</section>
<!--<script src="js/jquery-1.11.1.min.js"></script>--> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/jquery.prettyPhoto.js"></script> 
<script src="js/jquery.datatables.min.js"></script> 
<script src="js/select2.min.js"></script> 
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
  jQuery(document).ready(function() {
    
    "use strict";
    
    jQuery('#table1').dataTable();
    
    jQuery('#table2').dataTable({
      "sPaginationType": "full_numbers"
    });
    
    // Select2
    jQuery('select').select2({
        minimumResultsForSearch: -1
    });
    
    jQuery('select').removeClass('form-control');
    
    // Delete row in a table
    jQuery('.delete-row').click(function(){
      var c = confirm("Continue delete?");
      if(c)
        jQuery(this).closest('tr').fadeOut(function(){
          jQuery(this).remove();
        });
        
        return false;
    });
    
    // Show aciton upon row hover
    jQuery('.table-hidaction tbody tr').hover(function(){
      jQuery(this).find('.table-action-hide a').animate({opacity: 1});
    },function(){
      jQuery(this).find('.table-action-hide a').animate({opacity: 0});
    });
  
  
  });
</script>
</body>
</html>
