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
if ( !in_array( "9", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights

// $date = new DateTime('now');
// //$to_da = $date->format('Y-m-d');

// $date->modify('first day of this month');
// $to_da = $date->format('Y-m-d');

// $date->modify('last day of this month');
// $la_da = $date->format('Y-m-d');

// and Date(td.dl_hsb_date) >= '$to_da' and Date(td.dl_hsb_date) <= '$la_da'
// and Date(td.dl_hsb_date) >= '$to_da' and Date(td.dl_hsb_date) <= '$la_da'
// and Date(td.dl_hsb_date) >= '$to_da' and Date(td.dl_hsb_date) <= '$la_da'
// and Date(td.dl_hsb_date) >= '$to_da' and Date(td.dl_hsb_date) <= '$la_da'

//echo $to_da; exit;

if($_REQUEST["submit_search"]!=""){
$strdate = $_REQUEST['strdate'];
$enddate = $_REQUEST['enddate'];
$strdate = date("Y-m-d", strtotime($strdate));
$enddate = date("Y-m-d", strtotime($enddate));
$dl_hsb_incexp = $_REQUEST['dl_hsb_incexp'];
$pm_id = $_REQUEST['pm_id'];
// echo $dl_hsb_incexp; exit;

  if($dl_hsb_incexp==1){
		$aol_tp_qu = "and td.dl_hsb_incexp=1";
		$fl_nam = "Income";
	} else if($dl_hsb_incexp==2){
		$aol_tp_qu = "and td.dl_hsb_incexp=2";
		$fl_nam = "Expense";
	} else {
		$aol_tp_qu = "and td.dl_hsb_incexp IN (1,2)";
		$fl_nam = "IncomeExpense";
	}

  if($pm_id!=""){
		$aol_pm_id = "and td.pm_id=".$pm_id;
 	} else {
		$aol_pm_id = "";
	}


  $query_expe_tot = "SELECT * FROM daily_hisab_detail td, pay_method_detail pd where td.pm_id=pd.pm_id and  td.dl_hsb_status=1 ".$aol_tp_qu." ".$aol_pm_id." and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.dl_hsb_status IN (1,2) and Date(td.dl_hsb_date) >= '$strdate' and Date(td.dl_hsb_date) <= '$enddate' ORDER BY td.dl_hsb_id";
  $result_tot = $con->query( $query_expe_tot );
  $total_records = $result_tot->num_rows;

  $query_expe = "SELECT * FROM daily_hisab_detail td, pay_method_detail pd  where td.pm_id=pd.pm_id and td.dl_hsb_status=1 ".$aol_tp_qu." ".$aol_pm_id." and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.dl_hsb_status IN (1,2) and Date(td.dl_hsb_date) >= '$strdate' and Date(td.dl_hsb_date) <= '$enddate'  ORDER BY td.dl_hsb_id";

  $query_income = "SELECT SUM(dl_hsb_amount) as total_income FROM daily_hisab_detail td, pay_method_detail pd where td.pm_id=pd.pm_id and  td.dl_hsb_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.dl_hsb_incexp=1 ".$aol_pm_id." and Date(td.dl_hsb_date) >= '$strdate' and Date(td.dl_hsb_date) <= '$enddate'";
	$result_income = $con->query( $query_income );
	$row_income = $result_income->fetch_object();
	$final_income = $row_income->total_income;

	$query_expense = "SELECT SUM(dl_hsb_amount) as total_expense FROM daily_hisab_detail td, pay_method_detail pd where td.pm_id=pd.pm_id and td.dl_hsb_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.dl_hsb_incexp=2 ".$aol_pm_id." and Date(td.dl_hsb_date) >= '$strdate' and Date(td.dl_hsb_date) <= '$enddate'";
	$result_expense = $con->query( $query_expense );
	$row_expense = $result_expense->fetch_object();
	$final_expense = $row_expense->total_expense;
	

} else {

$query_expe_tot = "SELECT * FROM daily_hisab_detail td, pay_method_detail pd where td.pm_id=pd.pm_id and  td.dl_hsb_incexp IN(1,2) and td.dl_hsb_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.dl_hsb_status IN (1,2) ".$aol_pm_id."  ORDER BY td.dl_hsb_id";
$result_tot = $con->query( $query_expe_tot );
$total_records = $result_tot->num_rows;
// echo $total_records; exit;

$query_expe = "SELECT * FROM daily_hisab_detail td, pay_method_detail pd  where td.pm_id=pd.pm_id and td.dl_hsb_incexp IN(1,2) and td.dl_hsb_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.dl_hsb_status IN (1,2) ".$aol_pm_id."   ORDER BY td.dl_hsb_id";

  $query_income = "SELECT SUM(dl_hsb_amount) as total_income FROM daily_hisab_detail td, pay_method_detail pd where td.pm_id=pd.pm_id and td.dl_hsb_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.dl_hsb_incexp=1 ".$aol_pm_id." ";
	$result_income = $con->query( $query_income );
	$row_income = $result_income->fetch_object();
	$final_income = $row_income->total_income;

	$query_expense = "SELECT SUM(dl_hsb_amount) as total_expense FROM daily_hisab_detail td, pay_method_detail pd where td.pm_id=pd.pm_id and td.dl_hsb_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.dl_hsb_incexp=2 ".$aol_pm_id." ";
	$result_expense = $con->query( $query_expense );
	$row_expense = $result_expense->fetch_object();
	$final_expense = $row_expense->total_expense;

}
$final_balance = $final_income-$final_expense;


// SELECT SUM(score) as sum_score FROM game;

if ($_REQUEST["submit_report"] != "") {
  $strdate = $_REQUEST['strdate'];
  $enddate = $_REQUEST['enddate'];
  $dl_hsb_incexp = $_REQUEST['dl_hsb_incexp'];
  $pm_id = $_REQUEST['pm_id'];

  $strdate = date("Y-m-d", strtotime($strdate));
  $enddate = date("Y-m-d", strtotime($enddate));
	header( 'Location: daily_hisab_export.php?strdate=' . $strdate . '&enddate=' . $enddate.'&dl_hsb_incexp=' . $dl_hsb_incexp.'&pm_id=' . $pm_id.'' );
}


?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Daily Hisab List   - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
   function deleterec(id)
	{
		if(confirm("Are you sure want to delete?"))
		{
			window.location="daily_hisab_delete.php?dl_hsb_id="+id;
		}
	} 
	</script> 
  
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
      <h2><i class="fa fa-table"></i> Daily Hisab List   </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="#">Dashboard</a></li>
          <li class="active">Daily Hisab List  </li>
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
          <p class="mb20" style="color:green">Daily Hisab details added successfully.</p>
          <?php } else if($_GET['flag']==2) {?>
          <p class="mb20" style="color:green">Daily Hisab details updated successfully.</p>
          <?php } else if($_GET['flag']==3) {?>
          <p class="mb20" style="color:green">Daily Hisab details deleted successfully.</p>
          <?php } ?>
          <?php } ?>
          <div class="col-md-12" style="margin:0px 0px 20px 0px;">

         
            <div class="col-md-12">
              <form class="form-horizontal" method="post" action="">
                <div class="col-md-2"> <span> From Date:&nbsp;  </span>
                  <input style="line-height:20px;" class="form-control" required name="strdate" type="date" value="<?php if ($std != "") { $datend2   = new DateTime($std); echo $datend2->format('Y-m-d'); } else if($_REQUEST['strdate']!="") { echo $_REQUEST['strdate'];}  ?>" placeholder="Select Date" />
                </div>
                <div class="col-md-2"> <span>To Date:&nbsp;</span>
                  <input style="line-height:20px;" class="form-control" required name="enddate" type="date" value="<?php if ($edd != "") { $datend3   = new DateTime($edd); echo $datend3->format('Y-m-d'); } else if($_REQUEST['enddate']!="") { echo $_REQUEST['enddate'];}   ?>" placeholder="Select Date" />
                </div>
                <div class="col-md-2"> <span>Income/Expense:&nbsp;</span><br>
                <select style="width: 100%;" class="form-control" name="dl_hsb_incexp" >
                  <option value="" > Select  </option>
                  <option value="1" <?php if($_REQUEST['dl_hsb_incexp']==1) { ?>selected<?php } ?> >Income </option>
                  <option value="2" <?php if($_REQUEST['dl_hsb_incexp']==2) { ?>selected<?php } ?>>Expense </option>
                </select>
                </div>
                
                <div class="col-md-2"> <span>Pay Method:&nbsp;</span><br>
                <select style="width: 100%;" class="form-control" name="pm_id" >
                  <option value="" > Select Pay Method  </option>
                  <?php
                  $query_pm = "SELECT * FROM pay_method_detail WHERE pm_status=1";
                  $result_pm = $con->query( $query_pm );
                  while ( $row_pm = $result_pm->fetch_object() ) {
                    ?>
                  <option <?php if($_REQUEST['pm_id']==$row_pm->pm_id) { ?>selected<?php } ?> value="<?php echo $row_pm->pm_id ?>"><?php echo $row_pm->pm_name ?> </option>
                  <?php } ?>
                 </select>
                </div>
                <div class="col-md-2"> <span>&nbsp;</span>
                <input  class="btn btn-primary form-control" type="submit" name="submit_search" value="Search" /> 
                </div>
                <div class="col-md-2"> <span>&nbsp;</span>
                  <input class="btn btn-primary form-control" type="submit" name="submit_report" value="Download Date Wise Report" />
                </div>
                
              </form>
            </div>
          </div>
          <h4 class="text-center"> 
	
          <?php if($_REQUEST['dl_hsb_incexp']==1){ ?>
          <span style="color: green;">Total Income : <b><?php echo "&#8377;".number_format($final_income,2); ?></b></span> 
          <?php } else if($_REQUEST['dl_hsb_incexp']==2){ ?>
            <span style="color: red;">Total Expense : <b><?php echo "&#8377;".number_format($final_expense,2); ?></b></span>
          <?php } else { ?>
            <span style="color: green;">Income : <b><?php echo "&#8377;".number_format($final_income,2); ?></b></span> - <span style="color: red;">Expense : <b><?php echo "&#8377;".number_format($final_expense,2); ?></b></span> = <span style="color: blue;">Balance : <b><?php echo "&#8377;".number_format($final_balance,2); ?></b></span> 
          <?php } ?>
          

          </h4>
          <div class="table-responsive"> 
             
            <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
              <thead bgcolor="#82c21f">
                <tr>
                  <th  width="5%">ID</th>
                  <th  width="5%">No.</th>
                  <th  width="10%">Date</th> 
                  <th  width="10%">Pay Method</th> 
                  <th  width="10%">Reg No.</th> 
                  <th width="35%">Description</th>
                  <th width="15%">Amount</th>
                  
                  <th  width="10%">Type</th> 
                   <th   width="5%">Action</th>
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
                <tr class="odd gradeX" style="background-color: <?php if($row_state->dl_hsb_incexp==1) { ?>#E7F1E8<?php } else { ?>#FFD5D4<?php } ?> !important;">
                  <td ><?php echo $row_state->dl_hsb_id;?></td>
                  <td ><?php echo $row_state->dl_hsb_code_no;?></td>
                  <td ><?php
                  $datend = new DateTime( $row_state->dl_hsb_date );
                  echo $datend->format( 'D, d-m-Y' );
                  ?></td>
                  <td><?php echo $row_state->pm_name;?></td>
                  <td><?php echo $row_state->dl_hsb_regno;?></td>

                  <td><a title="Edit" style="color:green;" href="daily_hisab_edit.php?dl_hsb_id=<?php echo $row_state->dl_hsb_id?>"><?php echo $row_state->dl_hsb_description;?></a></td>
                  <td><?php echo "&#8377;".number_format($row_state->dl_hsb_amount,2);?></td>
                  
                   
                  <td ><?php if($row_state->dl_hsb_incexp==1) {  echo "Income"; } elseif($row_state->dl_hsb_incexp==2) { echo "Expense"; } ?></td>
                  <td   width="17%"><code> <a title="Edit" style="color:green;" href="daily_hisab_edit.php?dl_hsb_id=<?php echo $row_state->dl_hsb_id?>"><i class="fa fa-pen"></i></a> | <a title="Delete" style="color:red;" href="javascript:deleterec(<?php echo $row_state->dl_hsb_id?>)"><i class="fa fa-trash"></i></a> <code></td>
                </tr>
                <?php }} ?>
              </tbody>
              <tfoot>
                <tr>
                  <th width="5%" width="8%">ID</th>
                  <th width="5%" width="8%">No.</th>
                  <th width="10%">Date</th>
                  <th width="10%">Pay Method</th>
                  <th width="10%">Reg No.</th>
                  <th width="35%">Description</th>
                  <th width="15%">Amount</th>
                  
                  <th  width="10%">Type</th>
                   <th  width="5%">Action</th>
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
